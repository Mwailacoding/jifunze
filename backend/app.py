import os
import mysql.connector
from flask import Flask, request, jsonify, make_response, url_for
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask_cors import CORS
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer, SignatureExpired, BadSignature
import logging
from logging.handlers import RotatingFileHandler
import requests
from bs4 import BeautifulSoup
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from flask import send_file
import json
from datetime import timedelta

# Ensure the required directories exist
os.makedirs('logs', exist_ok=True)
os.makedirs('offline_content', exist_ok=True)

# Initialize Flask app
app = Flask(__name__)

# Configure CORS with proper security settings
CORS(app)
# CORS(app, resources={
#     r"/*": {
#         "origins": [
#             "http://localhost:5173",
#             "http://localhost:5000",
#             "https://jifunzemara.pythonanywhere.com"
#         ],
#         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#         "allow_headers": ["Content-Type", "Authorization", "x-access-token"],
#         "supports_credentials": True
#     }
# })

# Database Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'hospitality_training_apps'
}

# App Configuration
app.config['SECRET_KEY'] = 'gamification_secret_key'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)

# Email Configuration
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'ayukoivy03@gmail.com'
app.config['MAIL_PASSWORD'] = 'pwyt mwfm ifwh poox'
app.config['MAIL_DEFAULT_SENDER'] = 'ayukoivy03@gmail.com'
app.config['SECURITY_PASSWORD_SALT'] = 'pwyt mwfm ifwh poox'

# Offline Content Configuration
app.config['OFFLINE_CONTENT_DIR'] = 'offline_content'
app.config['MAX_OFFLINE_CONTENT_SIZE'] = 500 * 1024 * 1024  # 500MB

# Gamification Configuration
app.config['POINTS_FOR_COMPLETION'] = 100
app.config['POINTS_FOR_QUIZ'] = 50
app.config['POINTS_FOR_ASSIGNMENT'] = 200
app.config['BADGE_THRESHOLDS'] = {
    'bronze': 500,
    'silver': 1500,
    'gold': 3000,
    'platinum': 5000
}

# Initialize extensions
mail = Mail(app)
serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

# Set up logging
file_handler = RotatingFileHandler(
    'logs/app.log',
    maxBytes=10240,
    backupCount=10,
    delay=True  # Delay file opening until the first write
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)

# Ensure the logs directory exists
os.makedirs('logs', exist_ok=True)
# Database Helper Functions
def get_db_connection():
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            conn = mysql.connector.connect(**db_config)
            return conn
        except mysql.connector.Error as e:
            if attempt == max_retries - 1:
                app.logger.error("Failed to get database connection after retries")
                raise
            app.logger.warning(f"Database connection failed, retrying in {retry_delay} sec (attempt {attempt + 1}/{max_retries})")
            time.sleep(retry_delay)
            retry_delay *= 2  # Exponential backoff

def dict_to_json_serializable(data):
    """Convert dictionary with datetime objects to JSON serializable format"""
    if isinstance(data, dict):
        return {k: dict_to_json_serializable(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [dict_to_json_serializable(item) for item in data]
    elif isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, bytes):
        return data.decode('utf-8')
    else:
        return data

def execute_query(query, params=None, fetch_one=False, fetch_all=False, lastrowid=False):
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())

        if lastrowid:
            result = cursor.lastrowid
            conn.commit()
        elif fetch_one:
            result = cursor.fetchone()
            # Consume any remaining results
        elif fetch_all:
            result = cursor.fetchall()
        else:
            result = None
            conn.commit()

        return result
    except Exception as e:
        app.logger.error(f"Database error: {str(e)}")
        if conn:
            conn.rollback()
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
# Helper functions
def check_quiz_badges(user_id, quiz_id, quiz_score):
    """Check and award badges based on quiz performance"""
    badges_awarded = []
    
    # Check for perfect score badge
    if quiz_score == 100:
        badge_id = 'quiz_perfect'
        if not user_has_badge(user_id, badge_id):
            award_badge_direct(user_id, badge_id)
            badges_awarded.append(badge_id)
    
    # Check for quiz master badge (completed 10 quizzes)
    quiz_count = execute_query(
        "SELECT COUNT(DISTINCT quiz_id) as count FROM quiz_results "
        "WHERE user_id = %s AND passed = TRUE",
        (user_id,),
        fetch_one=True
    )['count']
    
    if quiz_count >= 10 and not user_has_badge(user_id, 'quiz_master'):
        award_badge_direct(user_id, 'quiz_master')
        badges_awarded.append('quiz_master')
    
    # Check for subject-specific badges
    quiz_category = execute_query(
        "SELECT m.category FROM quizzes q "
        "JOIN modules m ON q.module_id = m.id "
        "WHERE q.id = %s",
        (quiz_id,),
        fetch_one=True
    )
    
    if quiz_category:
        category = quiz_category['category'].lower().replace(' ', '_')
        badge_id = f"{category}_expert"
        
        # Check if user has completed all quizzes in this category
        category_quiz_count = execute_query(
            "SELECT COUNT(DISTINCT q.id) as total FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE m.category = %s",
            (quiz_category['category'],),
            fetch_one=True
        )['total']
        
        user_category_quiz_count = execute_query(
            "SELECT COUNT(DISTINCT qr.quiz_id) as completed FROM quiz_results qr "
            "JOIN quizzes q ON qr.quiz_id = q.id "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE qr.user_id = %s AND qr.passed = TRUE AND m.category = %s",
            (user_id, quiz_category['category']),
            fetch_one=True
        )['completed']
        
        if (user_category_quiz_count >= category_quiz_count and 
            not user_has_badge(user_id, badge_id)):
            award_badge_direct(user_id, badge_id)
            badges_awarded.append(badge_id)
    
    return badges_awarded

def user_has_badge(user_id, badge_id):
    """Check if user already has a specific badge"""
    result = execute_query(
        "SELECT 1 FROM user_badges WHERE user_id = %s AND badge_id = %s",
        (user_id, badge_id),
        fetch_one=True
    )
    return bool(result)

def award_badge_direct(user_id, badge_id):
    """Award a badge to a user without sending notification"""
    execute_query(
        "INSERT INTO user_badges (user_id, badge_id, earned_at) "
        "VALUES (%s, %s, %s)",
        (user_id, badge_id, datetime.now(timezone.utc))
    )
    
    # Log the badge award
    app.logger.info(f"User {user_id} awarded badge {badge_id}")
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in multiple possible locations
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        elif 'x-access-token' in request.headers:
            token = request.headers['x-access-token']
            
        if not token:
            app.logger.warning('Token is missing in request')
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = get_user_by_id(data['user_id'])
            if not current_user:
                app.logger.warning(f'User not found for token: {data["user_id"]}')
                raise ValueError("User not found")
        except jwt.ExpiredSignatureError:
            app.logger.warning('Expired token received')
            return jsonify({'message': 'Token has expired!'}), 401
        except jwt.InvalidTokenError:
            app.logger.warning('Invalid token received')
            return jsonify({'message': 'Token is invalid!'}), 401
        except Exception as e:
            app.logger.error(f'Token validation failed: {str(e)}')
            return jsonify({'message': 'Token validation failed!'}), 401

        return f(current_user, *args, **kwargs)
    return decorated
def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Admin access required!'}), 403
        return f(current_user, *args, **kwargs)
    return decorated

def trainer_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] not in ['admin', 'trainer']:
            app.logger.warning(f'User {current_user["id"]} attempted trainer access without proper role')
            return jsonify({
                'message': 'Trainer access required!',
                'required_role': 'trainer or admin',
                'current_role': current_user['role']
            }), 403
        return f(current_user, *args, **kwargs)
    return decorated

def send_email(to, subject, template):
    try:
        msg = Message(
            subject,
            recipients=[to],
            html=template,
            sender=app.config['MAIL_DEFAULT_SENDER']
        )
        mail.send(msg)
        app.logger.info(f"Email sent to {to}")
        return True
    except Exception as e:
        app.logger.error(f"Failed to send email to {to}: {str(e)}")
        return False

def calculate_offline_size(user_id):
    """Calculate the total size of offline content for a user"""
    total_size = 0
    offline_dir = os.path.join(app.config['OFFLINE_CONTENT_DIR'], str(user_id))
    if os.path.exists(offline_dir):
        for dirpath, _, filenames in os.walk(offline_dir):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                total_size += os.path.getsize(fp)
    return total_size

def check_offline_access(user_id, content_id):
    """Check if content is available offline for a user"""
    offline_path = os.path.join(
        app.config['OFFLINE_CONTENT_DIR'],
        str(user_id),
        str(content_id)
    )
    return os.path.exists(offline_path)
def award_points(user_id, points, reason):
    """Award points to a user and check for badge achievements"""
    try:
        # Add points
        execute_query(
            "INSERT INTO user_points (user_id, points, reason, awarded_at) "
            "VALUES (%s, %s, %s, %s)",
            (user_id, points, reason, datetime.now(timezone.utc))
        )

        # Get total points
        result = execute_query(
            "SELECT COALESCE(SUM(points), 0) as total_points FROM user_points WHERE user_id = %s",
            (user_id,),
            fetch_one=True
        )
        total_points = result['total_points']
        
        # Check for badge thresholds
        badges_awarded = []
        for badge_level, threshold in app.config['BADGE_THRESHOLDS'].items():
            if total_points >= threshold:
                # Check if user already has this badge
                result = execute_query(
                    "SELECT 1 FROM user_badges WHERE user_id = %s AND badge_id = %s",
                    (user_id, badge_level),
                    fetch_one=True
                )
                if not result:
                    # Award badge
                    execute_query(
                        "INSERT INTO user_badges (user_id, badge_id, earned_at) "
                        "VALUES (%s, %s, %s)",
                        (user_id, badge_level, datetime.now(timezone.utc))
                    )
                    badges_awarded.append(badge_level)

        # Update leaderboard
        update_leaderboard(user_id)

        # Return information about points and any new badges
        return {
            'total_points': total_points,
            'badges_awarded': badges_awarded
        }

    except Exception as e:
        app.logger.error(f"Error awarding points to user {user_id}: {str(e)}")
        raise
def generate_certificate_pdf(certificate_data, preview=False):
    """Generate a PDF certificate based on the certificate data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    styles.add(ParagraphStyle(name='Title', fontSize=18, alignment=1, spaceAfter=20))
    styles.add(ParagraphStyle(name='Subtitle', fontSize=14, alignment=1, spaceAfter=20))
    styles.add(ParagraphStyle(name='Body', fontSize=12, alignment=1, spaceAfter=12))
    styles.add(ParagraphStyle(name='Signature', fontSize=12, alignment=1, spaceBefore=72))

    # Certificate elements
    elements = []

    # Add logo (if available)
    try:
        logo_path = os.path.join(app.static_folder, 'logo.png')
        if os.path.exists(logo_path):
            logo = Image(logo_path, width=2*inch, height=1*inch)
            elements.append(logo)
    except Exception:
        pass

    # Title
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("CERTIFICATE OF ACHIEVEMENT", styles['Title']))
    elements.append(Spacer(1, 0.25*inch))

    # Subtitle
    elements.append(Paragraph("This is to certify that", styles['Subtitle']))
    elements.append(Spacer(1, 0.25*inch))

    # User name
    elements.append(Paragraph(certificate_data['user_name'], styles['Title']))
    elements.append(Spacer(1, 0.25*inch))

    # Description
    elements.append(Paragraph(certificate_data['description'], styles['Body']))
    elements.append(Spacer(1, 0.5*inch))

    # Details table
    data = [
        ["Date Completed:", certificate_data['completed_at']],
        ["Certificate ID:", certificate_data['certificate_id']]
    ]

    if 'score' in certificate_data:
        data.append(["Score:", f"{certificate_data['score']}/{certificate_data['max_score']}"])
        data.append(["Percentage:", f"{certificate_data['percentage']}%"])

    table = Table(data, colWidths=[2*inch, 3*inch])
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
        ('ALIGN', (1, 0), (1, -1), 'LEFT'),
    ]))
    elements.append(table)
    elements.append(Spacer(1, 0.5*inch))

    # Signature line
    elements.append(Paragraph("_________________________", styles['Signature']))
    elements.append(Paragraph("Training Administrator", styles['Signature']))

    # Build PDF
    doc.build(elements)

    buffer.seek(0)
    return buffer
def extract_youtube_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)',
        r'(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?]+)',
        r'(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([^\/]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match and match.group(1):
            return match.group(1)
    return None
def update_leaderboard(user_id):
    """Debug-friendly leaderboard updater with comprehensive logging"""
    try:
        app.logger.info(f"Starting leaderboard update for user {user_id}")
        
        # 1. Get total points (with debug logging)
        points_query = """
            SELECT COALESCE(SUM(points), 0) as total_points 
            FROM user_points 
            WHERE user_id = %s
        """
        points_result = execute_query(points_query, (user_id,), fetch_one=True)
        total_points = points_result['total_points'] if points_result else 0
        app.logger.info(f"User {user_id} points: {total_points}")

        # 2. Count badges (with debug logging)
        badges_query = """
            SELECT COUNT(*) as badges_count 
            FROM user_badges 
            WHERE user_id = %s
        """
        badges_result = execute_query(badges_query, (user_id,), fetch_one=True)
        badges_count = badges_result['badges_count'] if badges_result else 0
        app.logger.info(f"User {user_id} badges: {badges_count}")

        # 3. Count completed modules (optimized query)
        modules_query = """
            SELECT COUNT(DISTINCT m.id) as count
            FROM modules m
            JOIN module_content mc ON m.id = mc.module_id
            LEFT JOIN user_progress up ON (
                mc.id = up.content_id 
                AND up.user_id = %s 
                AND up.status = 'completed'
            )
            GROUP BY m.id
            HAVING COUNT(mc.id) = SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END)
        """
        modules_result = execute_query(modules_query, (user_id,), fetch_all=True)
        modules_completed = len(modules_result) if modules_result else 0
        app.logger.info(f"User {user_id} completed modules: {modules_completed}")

        # 4. Get quiz statistics (simplified)
        quizzes_query = """
            SELECT 
                COUNT(DISTINCT quiz_id) as quizzes_taken,
                COUNT(DISTINCT CASE WHEN passed = TRUE THEN quiz_id END) as quizzes_passed,
                COALESCE(AVG(CASE WHEN passed = TRUE THEN percentage END), 0) as avg_quiz_score
            FROM quiz_results 
            WHERE user_id = %s
        """
        quiz_stats = execute_query(quizzes_query, (user_id,), fetch_one=True) or {
            'quizzes_taken': 0,
            'quizzes_passed': 0,
            'avg_quiz_score': 0
        }
        app.logger.info(f"User {user_id} quiz stats: {quiz_stats}")

        # 5. UPSERT with transaction handling
        upsert_query = """
            INSERT INTO leaderboard (
                user_id, total_points, badges_count, modules_completed,
                quizzes_taken, quizzes_passed, avg_quiz_score, last_updated
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                total_points = VALUES(total_points),
                badges_count = VALUES(badges_count),
                modules_completed = VALUES(modules_completed),
                quizzes_taken = VALUES(quizzes_taken),
                quizzes_passed = VALUES(quizzes_passed),
                avg_quiz_score = VALUES(avg_quiz_score),
                last_updated = VALUES(last_updated)
        """
        params = (
            user_id,
            total_points,
            badges_count,
            modules_completed,
            quiz_stats['quizzes_taken'],
            quiz_stats['quizzes_passed'],
            quiz_stats['avg_quiz_score'],
            datetime.now(timezone.utc)
        )

        # Execute with explicit connection handling
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute(upsert_query, params)
            conn.commit()
            app.logger.info(f"Successfully updated leaderboard for user {user_id}")
            return True
        except Exception as e:
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                conn.close()

    except Exception as e:
        app.logger.error(f"CRITICAL ERROR updating leaderboard for user {user_id}: {str(e)}", exc_info=True)
        return False
@app.route('/debug/user/<int:user_id>/stats', methods=['GET'])
def debug_user_stats(user_id):
    """Debug endpoint to check raw user data"""
    stats = {
        'points': execute_query("SELECT COALESCE(SUM(points), 0) as total FROM user_points WHERE user_id = %s", (user_id,), fetch_one=True),
        'badges': execute_query("SELECT COUNT(*) as count FROM user_badges WHERE user_id = %s", (user_id,), fetch_one=True),
        'modules': execute_query("""
            SELECT COUNT(DISTINCT m.id) as count
            FROM modules m
            JOIN module_content mc ON m.id = mc.module_id
            LEFT JOIN user_progress up ON (mc.id = up.content_id AND up.user_id = %s AND up.status = 'completed')
            GROUP BY m.id
            HAVING COUNT(mc.id) = SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END)
        """, (user_id,), fetch_all=True),
        'quizzes': execute_query("""
            SELECT COUNT(DISTINCT quiz_id) as taken,
                   COUNT(DISTINCT CASE WHEN passed THEN quiz_id END) as passed,
                   AVG(CASE WHEN passed THEN percentage END) as avg_score
            FROM quiz_results WHERE user_id = %s
        """, (user_id,), fetch_one=True)
    }
    return jsonify(dict_to_json_serializable(stats))

@app.route('/debug/leaderboard/force-update/<int:user_id>', methods=['POST'])
def debug_force_update(user_id):
    """Force update a user's leaderboard entry"""
    success = update_leaderboard(user_id)
    return jsonify({'success': success, 'user_id': user_id})
def get_user_by_id(user_id):
    user = execute_query(
        "SELECT id, email, first_name, last_name, role, password_hash, is_active, employer_id, department_id FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    if user:
        return dict_to_json_serializable(user)
    return None
def get_user_by_email(email):
    user = execute_query(
        "SELECT id, email, first_name, last_name, role, password_hash, is_active FROM users WHERE email = %s",
        (email,),
        fetch_one=True
    )
    if user:
        # If the password hash doesn't start with a known method, update it
        if not user['password_hash'].startswith(('pbkdf2:', 'sha256:', 'argon2', 'bcrypt')):
            # Generate a new proper hash
            new_hash = generate_password_hash('temporary', method='pbkdf2:sha256')
            execute_query(
                "UPDATE users SET password_hash = %s WHERE email = %s",
                (new_hash, email)
            )
            user['password_hash'] = new_hash
        return dict_to_json_serializable(user)
    return None

@app.route('/leaderboard/debug', methods=['GET'])
@token_required
def debug_leaderboard(current_user):
    """Debug endpoint to test leaderboard updates"""
    try:
        if current_user.get('employer_id'):
            update_leaderboard(current_user['id'], current_user['employer_id'])
            return jsonify({
                'status': 'update_leaderboard called',
                'user_id': current_user['id'],
                'employer_id': current_user['employer_id']
            })
        return jsonify({'status': 'no employer_id'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@app.route('/register', methods=['POST', 'OPTIONS'])
def register():
    # Handle CORS preflight request
    if request.method == 'OPTIONS':
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response
    
    try:
        if not request.is_json:
            return jsonify({'message': 'Request must be JSON'}), 400

        data = request.get_json()
        required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            return jsonify({'message': f'Missing required fields: {missing}'}), 400

        # Validate role
        valid_roles = ['admin', 'trainer', 'user']
        if data['role'].lower() not in valid_roles:
            return jsonify({'message': 'Invalid role specified'}), 400

        # Check if email is already registered
        existing_user = execute_query(
            "SELECT id FROM users WHERE email = %s",
            (data['email'],),
            fetch_one=True
        )
        if existing_user:
            return jsonify({'message': 'Email already registered'}), 409

        # Special admin email check (only these emails can register as admin)
        admin_emails = ['malikaivy@gmail.com', 'flirtycoding3@gmail.com']
        if data['role'].lower() == 'admin' and data['email'] not in admin_emails:
            return jsonify({'message': 'Admin registration not allowed for this email'}), 403

        # Use consistent password hashing method
        hashed_password = generate_password_hash(
            data['password'], 
            method='pbkdf2:sha256',
            salt_length=16
        )

        user_id = execute_query(
            "INSERT INTO users (email, password_hash, first_name, last_name, role, employer_id, phone) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s)",
            (
                data['email'], 
                hashed_password, 
                data['first_name'], 
                data['last_name'],
                data['role'].lower(),  # Ensure lowercase role
                data.get('employer_id'), 
                data.get('phone')
            ),
            lastrowid=True
        )

        user = execute_query(
            "SELECT id, email, first_name, last_name, role FROM users WHERE id = %s",
            (user_id,),
            fetch_one=True
        )

        # Final role validation before returning
        if user:
            if user['role'].lower() not in valid_roles:
                # If somehow an invalid role got through, correct it to 'user'
                execute_query(
                    "UPDATE users SET role = 'user' WHERE id = %s",
                    (user['id'],)
                )
                user['role'] = 'user'
        else:
            raise ValueError("User not found after creation")

        token = jwt.encode(
            {
                'user_id': user['id'],
                'exp': datetime.now(timezone.utc) + timedelta(hours=1),
                'role': user['role']  # Include role in token payload
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        response_data = {
            'message': 'User registered successfully',
            'user': user,
            'token': token,
            'redirect_to': get_redirect_path(user['role'])  # Helper function for redirect
        }

        return jsonify(response_data), 201

    except Exception as e:
        app.logger.error(f"Registration process error: {str(e)}", exc_info=True)
        return jsonify({'message': 'Registration process failed'}), 500

def get_redirect_path(role):
    """Helper function to determine redirect path based on role"""
    role = role.lower()
    if role == 'admin':
        return '/admin/dashboard'
    elif role == 'trainer':
        return '/trainer/dashboard'
    return '/dashboard'
def award_badge_with_notification(user_id, badge_id):
    """Award a badge to a user and send notification"""
    # Check if user already has the badge
    if user_has_badge(user_id, badge_id):
        return False
    
    # Award the badge
    execute_query(
        "INSERT INTO user_badges (user_id, badge_id, earned_at) "
        "VALUES (%s, %s, %s)",
        (user_id, badge_id, datetime.now(timezone.utc))
    )
    
    # Get badge details
    badge = execute_query(
        "SELECT name, description FROM badges WHERE id = %s",
        (badge_id,),
        fetch_one=True
    )
    
    if not badge:
        app.logger.error(f"Badge {badge_id} not found in database")
        return False

    # Get user details
    user = execute_query(
        "SELECT email, first_name FROM users WHERE id = %s",
        (user_id,),
        fetch_one=True
    )
    
    if not user:
        app.logger.error(f"User {user_id} not found when awarding badge")
        return False

    # Create notification
    execute_query(
        "INSERT INTO notifications (user_id, title, message, notification_type, is_read) "
        "VALUES (%s, %s, %s, %s, FALSE)",
        (
            user_id,
            f"New Badge: {badge['name']}",
            f"You earned the {badge['name']} badge! {badge['description']}",
            'badge'
        )
    )

    # Send email notification
    notification_template = f"""
        <h1>Congratulations! You Earned a Badge</h1>
        <p>Dear {user['first_name']},</p>
        <p>You have been awarded the <strong>{badge['name']}</strong> badge!</p>
        <p>{badge['description']}</p>
        <p>Keep up the great work!</p>
        <p>Best regards,<br>Hospitality Training Team</p>
    """
    send_email(user['email'], f"New Badge: {badge['name']}", notification_template)

    return True
    
@app.route('/login', methods=['POST'])
def login():
    # Initialize response data
    response = {
        'success': False,
        'message': '',
        'token': None,
        'user': None,
        'redirect_to_admin': False
    }

    try:
        # Validate request format
        if not request.is_json:
            response['message'] = 'Request must be JSON'
            return jsonify(response), 400

        auth = request.get_json()
        
        # Validate required fields
        if not auth or not auth.get('email') or not auth.get('password'):
            response['message'] = 'Email and password are required'
            return jsonify(response), 400

        # Get user from database
        user = execute_query(
            "SELECT id, email, first_name, last_name, role, password_hash, is_active, employer_id FROM users WHERE email = %s",
            (auth['email'],),
            fetch_one=True
        )

        if not user:
            app.logger.warning(f"Login attempt for non-existent email: {auth['email']}")
            response['message'] = 'Invalid credentials'
            return jsonify(response), 401

        # Check if account is active
        if not user.get('is_active', True):
            response['message'] = 'Account is inactive. Please contact support.'
            return jsonify(response), 403

        # Verify password
        try:
            if not check_password_hash(user['password_hash'], auth['password']):
                app.logger.warning(f"Invalid password for user: {user['email']}")
                response['message'] = 'Invalid credentials'
                return jsonify(response), 401
        except ValueError as e:
            app.logger.error(f"Password hash verification failed for user {user['email']}: {str(e)}")
            response['message'] = 'Authentication system error'
            return jsonify(response), 500

        # Update last login
        execute_query(
            "UPDATE users SET last_login = %s WHERE id = %s",
            (datetime.now(timezone.utc), user['id'])
        )

        # Generate tokens
        token = jwt.encode(
            {
                'user_id': user['id'],
                'exp': datetime.now(timezone.utc) + app.config['JWT_ACCESS_TOKEN_EXPIRES']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        refresh_token = jwt.encode(
            {
                'user_id': user['id'],
                'exp': datetime.now(timezone.utc) + app.config['JWT_REFRESH_TOKEN_EXPIRES']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        # Normalize and validate user role
        user_role = user['role'].lower() if user.get('role') else 'user'
        if user_role not in ['admin', 'trainer', 'user']:
            user_role = 'user'  # Default to user if invalid

        # Check if user should be redirected to admin dashboard
        admin_emails = ['malikaivy@gmail.com', 'flirtycoding3@gmail.com']
        if user['email'].lower() in [email.lower() for email in admin_emails] and user_role == 'admin':
            response['redirect_to_admin'] = True

        # Prepare response data with normalized role
        response.update({
            'success': True,
            'message': 'Login successful',
            'token': token,
            'refresh_token': refresh_token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': user_role,  # Use normalized role
                'employer_id': user.get('employer_id'),
                'is_active': user.get('is_active', True)
            }
        })

        return jsonify(response), 200

    except mysql.connector.Error as db_error:
        app.logger.error(f"Database error during login: {str(db_error)}")
        response['message'] = 'Database operation failed'
        return jsonify(response), 500

    except jwt.PyJWTError as jwt_error:
        app.logger.error(f"JWT error during login: {str(jwt_error)}")
        response['message'] = 'Authentication system error'
        return jsonify(response), 500

    except Exception as e:
        app.logger.error(f"Unexpected error during login: {str(e)}", exc_info=True)
        response['message'] = 'Internal server error'
        return jsonify(response), 500
@app.route('/dashboard/admin-stats', methods=['GET'])
@token_required
@admin_required
def get_admin_dashboard_stats(current_user):
    """Get admin dashboard statistics"""
    try:
        stats = {
            'total_users': 0,
            'active_users': 0,
            'total_modules': 0,
            'active_modules': 0,
            'recent_activity': []
        }

        # Get user counts
        result = execute_query(
            "SELECT COUNT(*) as count FROM users",
            fetch_one=True
        )
        if result:
            stats['total_users'] = result['count']

        result = execute_query(
            "SELECT COUNT(*) as count FROM users WHERE is_active = TRUE",
            fetch_one=True
        )
        if result:
            stats['active_users'] = result['count']

        # Get module counts
        result = execute_query(
            "SELECT COUNT(*) as count FROM modules",
            fetch_one=True
        )
        if result:
            stats['total_modules'] = result['count']

        result = execute_query(
            "SELECT COUNT(*) as count FROM modules WHERE is_active = TRUE",
            fetch_one=True
        )
        if result:
            stats['active_modules'] = result['count']

        # Get recent activity
        stats['recent_activity'] = execute_query(
            "SELECT u.first_name, u.last_name, m.title as module_title, "
            "up.status, up.last_accessed "
            "FROM user_progress up "
            "JOIN users u ON up.user_id = u.id "
            "JOIN module_content mc ON up.content_id = mc.id "
            "JOIN modules m ON mc.module_id = m.id "
            "ORDER BY up.last_accessed DESC "
            "LIMIT 10",
            fetch_all=True
        )

        return jsonify(stats)

    except Exception as e:
        app.logger.error(f"Error fetching dashboard stats: {str(e)}")
        return jsonify({
            'message': 'Error fetching dashboard statistics',
            'error': str(e)
        }), 500 

@app.route('/user/<int:user_id>/certificates', methods=['GET'])
@token_required
def get_user_certificates(current_user, user_id):
    # Only allow users to view their own certificates, or admins
    if current_user['id'] != user_id and current_user['role'] != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403

    certificates = execute_query(
        "SELECT uc.id, uc.certificate_type, uc.item_id, uc.certificate_id, "
        "uc.generated_at, "
        "CASE "
        "WHEN uc.certificate_type = 'module' THEN m.title "
        "WHEN uc.certificate_type = 'quiz' THEN q.title "
        "END as title "
        "FROM user_certificates uc "
        "LEFT JOIN modules m ON uc.certificate_type = 'module' AND uc.item_id = m.id "
        "LEFT JOIN quizzes q ON uc.certificate_type = 'quiz' AND uc.item_id = q.id "
        "WHERE uc.user_id = %s "
        "ORDER BY uc.generated_at DESC",
        (user_id,),
        fetch_all=True
    )

    return jsonify(dict_to_json_serializable(certificates))

@app.route('/content/<int:content_id>/download', methods=['POST'])
@token_required
def download_content(current_user, content_id):
    """Allow a user to download content if available (file or video)"""
    # Fetch content info
    content = execute_query(
        "SELECT * FROM module_content WHERE id = %s",
        (content_id,),
        fetch_one=True
    )
    if not content:
        return jsonify({'message': 'Content not found'}), 404

    # Check if file_path exists and is downloadable
    if content.get('file_path'):
        file_path = content['file_path']
        if os.path.exists(file_path):
            return send_file(
                file_path,
                as_attachment=True,
                download_name=os.path.basename(file_path)
            )
        else:
            return jsonify({'message': 'File not found on server'}), 404

    # If content is a video or has a URL, return the URL
    if content.get('url'):
        return jsonify({'url': content['url']}), 200

    return jsonify({'message': 'No downloadable file or URL for this content'}), 400
@app.route('/refresh-token', methods=['POST'])
def refresh_token():
    refresh_token = request.json.get('refresh_token')
    if not refresh_token:
        return jsonify({'message': 'Refresh token is required'}), 401

    try:
        data = jwt.decode(refresh_token, app.config['SECRET_KEY'], algorithms=["HS256"])
        user = get_user_by_id(data['user_id'])
        
        if not user:
            return jsonify({'message': 'Invalid user'}), 401

        new_token = jwt.encode(
            {
                'user_id': user['id'],
                'exp': datetime.now(timezone.utc) + app.config['JWT_ACCESS_TOKEN_EXPIRES']
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        return jsonify({
            'token': new_token,
            'user': dict_to_json_serializable(user)
        })
    except jwt.ExpiredSignatureError:
        return jsonify({'message': 'Refresh token has expired'}), 401
    except jwt.InvalidTokenError:
        return jsonify({'message': 'Invalid refresh token'}), 401
    except KeyError as e:
        app.logger.error(f"KeyError in refresh_token: {str(e)}")
        return jsonify({'message': 'Invalid token structure'}), 401

@app.route('/forgot-password', methods=['POST'])
def forgot_password():
    email = request.json.get('email')
    if not email:
        return jsonify({'message': 'Email is required'}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({'message': 'If this email is registered, you will receive a password reset link'}), 200

    reset_token = serializer.dumps(email, salt=app.config['SECURITY_PASSWORD_SALT'])
    update_user(user['id'], {
        'reset_token': reset_token,
        'reset_token_expires': datetime.now(timezone.utc) + timedelta(hours=1)
    })

    reset_url = url_for('reset_password', token=reset_token, _external=True)
    reset_template = f"""
        <h1>Password Reset Request</h1>
        <p>Dear {user['first_name']},</p>
        <p>We received a request to reset your password. Click the link below to proceed:</p>
        <p><a href="{reset_url}">Reset Password</a></p>
        <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>Hospitality Training Team</p>
    """

    if send_email(user['email'], "Password Reset Request", reset_template):
        return jsonify({'message': 'Password reset link sent to your email'}), 200
    else:
        return jsonify({'message': 'Failed to send reset email'}), 500

@app.route('/reset-password/<token>', methods=['POST'])
def reset_password(token):
    try:
        email = serializer.loads(
            token,
            salt=app.config['SECURITY_PASSWORD_SALT'],
            max_age=3600
        )
    except SignatureExpired:
        return jsonify({'message': 'The reset link has expired'}), 400
    except BadSignature:
        return jsonify({'message': 'Invalid reset link'}), 400

    user = get_user_by_email(email)
    if not user or user['reset_token'] != token:
        return jsonify({'message': 'Invalid reset link'}), 400

    new_password = request.json.get('new_password')
    if not new_password:
        return jsonify({'message': 'New password is required'}), 400

    hashed_password = generate_password_hash(new_password)
    execute_query(
        "UPDATE users SET password_hash = %s, reset_token = NULL, reset_token_expires = NULL WHERE id = %s",
        (hashed_password, user['id'])
    )

    confirmation_template = f"""
        <h1>Password Changed Successfully</h1>
        <p>Dear {user['first_name']},</p>
        <p>Your password has been successfully updated.</p>
        <p>If you didn't make this change, please contact us immediately.</p>
        <p>Best regards,<br>Hospitality Training Team</p>
    """
    send_email(user['email'], "Password Changed", confirmation_template)

    return jsonify({'message': 'Password has been reset successfully'}), 200


@app.route('/profile', methods=['GET'])
@token_required
def profile(current_user):
    return jsonify(dict_to_json_serializable(current_user))

@app.route('/profile', methods=['PUT'])
@token_required
def update_profile(current_user, user_id):
    data = request.get_json()

    update_data = {}
    if 'first_name' in data:
        update_data['first_name'] = data['first_name']
    if 'last_name' in data:
        update_data['last_name'] = data['last_name']
    if 'phone' in data:
        update_data['phone'] = data['phone']
    if 'profile_picture' in data:
        update_data['profile_picture'] = data['profile_picture']

    if update_data:
        update_user(current_user['id'], update_data)
        return jsonify({
            'message': 'Profile updated successfully',
            'user': get_user_by_id(current_user['id'])
        })
    else:
        return jsonify({'message': 'No fields to update'}), 400

@app.route('/change-password', methods=['POST'])
@token_required
def change_password(current_user):
    try:
        # Validate request data
        if not request.is_json:
            return jsonify({'message': 'Request must be JSON'}), 400

        data = request.get_json()
        required_fields = ['current_password', 'new_password']
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            return jsonify({'message': f'Missing required fields: {missing}'}), 400

        # Verify current password
        if not check_password_hash(current_user['password_hash'], data['current_password']):
            return jsonify({'message': 'Current password is incorrect'}), 401

        # Validate new password (optional - add your own validation rules)
        if len(data['new_password']) < 8:
            return jsonify({'message': 'Password must be at least 8 characters long'}), 400

        # Generate new password hash with explicit method
        hashed_password = generate_password_hash(data['new_password'], method='pbkdf2:sha256')

        # Update password in database
        execute_query(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (hashed_password, current_user['id'])
        )

        # Send notification email
        notification_template = f"""
            <h1>Password Changed</h1>
            <p>Dear {current_user['first_name']},</p>
            <p>Your password was recently changed.</p>
            <p>If you didn't make this change, please contact us immediately.</p>
            <p>Best regards,<br>Hospitality Training Team</p>
        """
        send_email(current_user['email'], "Password Changed", notification_template)

        return jsonify({'message': 'Password changed successfully'}), 200

    except Exception as e:
        app.logger.error(f"Error changing password: {str(e)}")
        return jsonify({'message': 'Error changing password'}), 500
@app.route('/users', methods=['GET'])
@token_required
@admin_required
def get_all_users(current_user):
    users = execute_query(
        "SELECT id, email, first_name, last_name, role, employer_id, is_active FROM users",
        fetch_all=True
    )
    return jsonify(dict_to_json_serializable(users))

@app.route('/users/<int:user_id>', methods=['GET'])
@token_required
@admin_required
def get_user(current_user, user_id):
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({'message': 'User not found'}), 404
    return jsonify(dict_to_json_serializable(user))

@app.route('/users/<int:user_id>/role', methods=['PUT'])
@token_required
@admin_required
def update_user_role(current_user, user_id):
    data = request.get_json()
    if 'role' not in data:
        return jsonify({'message': 'Role is required'}), 400

    execute_query(
        "UPDATE users SET role = %s WHERE id = %s",
        (data['role'], user_id)
    )
    return jsonify({'message': 'User role updated successfully'})

@app.route('/users/<int:user_id>/activate', methods=['PUT'])
@token_required
@admin_required
def activate_user(current_user, user_id):
    execute_query(
        "UPDATE users SET is_active = TRUE WHERE id = %s",
        (user_id,)
    )

    user = get_user_by_id(user_id)
    if user and user['email']:
        notification_template = f"""
            <h1>Account Activated</h1>
            <p>Dear {user['first_name']},</p>
            <p>Your account has been activated by an administrator.</p>
            <p>You can now login and access the training platform.</p>
            <p>Best regards,<br>Hospitality Training Team</p>
        """
        send_email(user['email'], "Account Activated", notification_template)

    return jsonify({'message': 'User activated successfully'})

@app.route('/users/<int:user_id>/deactivate', methods=['PUT'])
@token_required
@admin_required
def deactivate_user(current_user, user_id):
    execute_query(
        "UPDATE users SET is_active = FALSE WHERE id = %s",
        (user_id,)
    )

    user = get_user_by_id(user_id)
    if user and user['email']:
        notification_template = f"""
            <h1>Account Deactivated</h1>
            <p>Dear {user['first_name']},</p>
            <p>Your account has been deactivated by an administrator.</p>
            <p>If you believe this is an error, please contact support.</p>
            <p>Best regards,<br>Hospitality Training Team</p>
        """
        send_email(user['email'], "Account Deactivated", notification_template)

    return jsonify({'message': 'User deactivated successfully'})

@app.route('/contact', methods=['POST'])
def contact():
    data = request.get_json()

    required_fields = ['name', 'email', 'message']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Name, email and message are required'}), 400

    contact_template = f"""
        <h1>New Contact Form Submission</h1>
        <p><strong>From:</strong> {data['name']} ({data['email']})</p>
        <p><strong>Message:</strong></p>
        <p>{data['message']}</p>
    """

    if send_email(app.config['MAIL_DEFAULT_SENDER'], "New Contact Form Submission", contact_template):
        confirmation_template = f"""
            <h1>Thank You for Contacting Us</h1>
            <p>Dear {data['name']},</p>
            <p>We have received your message and will get back to you soon.</p>
            <p>Best regards,<br>Hospitality Training Team</p>
        """
        send_email(data['email'], "Thank You for Contacting Us", confirmation_template)

        return jsonify({'message': 'Your message has been sent successfully'}), 200
    else:
        return jsonify({'message': 'Failed to send your message'}), 500

@app.route('/modules', methods=['GET'])
@token_required
def get_modules(current_user):
    modules = execute_query(
        "SELECT * FROM modules WHERE is_active = TRUE",
        fetch_all=True
    )

    for module in modules:
        result = execute_query(
            "SELECT COUNT(*) as total_contents FROM module_content WHERE module_id = %s",
            (module['id'],),
            fetch_one=True
        )
        total_contents = result['total_contents']

        if total_contents > 0:
            result = execute_query(
                "SELECT COUNT(*) as completed_contents FROM user_progress WHERE user_id = %s AND status = 'completed' "
                "AND content_id IN (SELECT id FROM module_content WHERE module_id = %s)",
                (current_user['id'], module['id']),
                fetch_one=True
            )
            completed_contents = result['completed_contents']
            module['completion_percentage'] = int((completed_contents / total_contents) * 100)
        else:
            module['completion_percentage'] = 0

    return jsonify(dict_to_json_serializable(modules))

@app.route('/modules/<int:module_id>', methods=['GET'])
@token_required
def get_module(current_user, module_id):
    """Get module details with content, youtube video info, quiz requirements, and user progress"""
    # Get module basic info
    module = execute_query(
        "SELECT * FROM modules WHERE id = %s AND is_active = TRUE",
        (module_id,),
        fetch_one=True
    )

    if not module:
        return jsonify({'message': 'Module not found'}), 404

    # Get all content for this module with youtube video info if available
    contents = execute_query(
        """SELECT mc.*, 
                  yv.youtube_url, 
                  yv.youtube_video_id,
                  yv.title as video_title,
                  yv.duration as video_duration
           FROM module_content mc
           LEFT JOIN youtube_videos yv ON mc.id = yv.content_id
           WHERE mc.module_id = %s
           ORDER BY mc.display_order""",
        (module_id,),
        fetch_all=True
    )

    # Get the module's quiz
    quiz = execute_query(
        "SELECT * FROM quizzes WHERE module_id = %s AND is_active = TRUE LIMIT 1",
        (module_id,),
        fetch_one=True
    )

    # Format contents and add user progress info
    formatted_contents = []
    for content in contents:
        # Get user's progress for each content item
        progress = execute_query(
            "SELECT * FROM user_progress WHERE user_id = %s AND content_id = %s",
            (current_user['id'], content['id']),
            fetch_one=True
        )
        
        # Format content with youtube info if video type
        content_data = {
            **content,
            'user_progress': progress if progress else {
                'status': 'not_started',
                'progress': 0
            },
            'offline_available': check_offline_access(current_user['id'], content['id']),
            'youtube_video': {
                'url': content['youtube_url'],
                'id': content['youtube_video_id'],
                'title': content['video_title'],
                'duration': content['video_duration']
            } if content['content_type'] == 'video' else None
        }
        formatted_contents.append(content_data)

    # Check if user has completed the module quiz
    quiz_completed = False
    if quiz:
        quiz_result = execute_query(
            "SELECT * FROM quiz_results WHERE user_id = %s AND quiz_id = %s AND passed = TRUE",
            (current_user['id'], quiz['id']),
            fetch_one=True
        )
        quiz_completed = bool(quiz_result)

    # Check if all content is completed
    all_content_completed = all(
        content['user_progress']['status'] == 'completed' 
        for content in formatted_contents
    )

    # Module is only complete when both content and quiz are done
    module_completed = all_content_completed and (not quiz or quiz_completed)

    # Get next module ID if available
    next_module = execute_query(
        "SELECT id FROM modules WHERE is_active = TRUE AND id > %s ORDER BY id ASC LIMIT 1",
        (module_id,),
        fetch_one=True
    )

    return jsonify({
        'module': module,
        'contents': formatted_contents,
        'quiz': quiz,
        'module_completed': module_completed,
        'quiz_completed': quiz_completed,
        'all_content_completed': all_content_completed,
        'next_module_id': next_module['id'] if next_module else None
    })

@app.route('/content/<int:content_id>/complete', methods=['POST'])
@token_required
def complete_content(current_user, content_id):
    """Mark content as completed and check if module can be advanced"""
    try:
        # Verify content exists and get module info
        content = execute_query(
            "SELECT mc.*, m.id as module_id FROM module_content mc "
            "JOIN modules m ON mc.module_id = m.id "
            "WHERE mc.id = %s",
            (content_id,),
            fetch_one=True
        )
        if not content:
            return jsonify({'message': 'Content not found'}), 404

        # Check if user has already completed this content
        existing_progress = execute_query(
            "SELECT * FROM user_progress WHERE user_id = %s AND content_id = %s",
            (current_user['id'], content_id),
            fetch_one=True
        )

        if existing_progress and existing_progress['status'] == 'completed':
            return jsonify({'message': 'Content already completed'}), 200

        # Update or create progress record
        if existing_progress:
            execute_query(
                "UPDATE user_progress SET status = 'completed', completed_at = %s "
                "WHERE user_id = %s AND content_id = %s",
                (datetime.now(timezone.utc), current_user['id'], content_id)
            )
        else:
            execute_query(
                "INSERT INTO user_progress (user_id, content_id, status, started_at, completed_at) "
                "VALUES (%s, %s, %s, %s, %s)",
                (
                    current_user['id'], content_id, 'completed',
                    datetime.now(timezone.utc), datetime.now(timezone.utc)
                )
            )

        # Award points for completion
        points_result = award_points(
            current_user['id'],
            app.config['POINTS_FOR_COMPLETION'],
            f"Completed content {content_id}"
        )

        # Check if all content in module is completed
        all_content = execute_query(
            "SELECT id FROM module_content WHERE module_id = %s",
            (content['module_id'],),
            fetch_all=True
        )
        
        completed_content = execute_query(
            "SELECT COUNT(DISTINCT content_id) as count FROM user_progress "
            "WHERE user_id = %s AND status = 'completed' "
            "AND content_id IN (SELECT id FROM module_content WHERE module_id = %s)",
            (current_user['id'], content['module_id']),
            fetch_one=True
        )['count']

        all_content_completed = completed_content >= len(all_content)

        # Check if module has a quiz
        quiz = execute_query(
            "SELECT id FROM quizzes WHERE module_id = %s AND is_active = TRUE LIMIT 1",
            (content['module_id'],),
            fetch_one=True
        )

        response = {
            'message': 'Content marked as completed',
            'points_awarded': app.config['POINTS_FOR_COMPLETION'],
            'all_content_completed': all_content_completed,
            'module_completed': False,
            'quiz_required': bool(quiz),
            'quiz_completed': False
        }

        if points_result.get('badges_awarded'):
            response['badges_awarded'] = points_result['badges_awarded']

        # If there's a quiz and all content is completed, check quiz status
        if quiz and all_content_completed:
            quiz_result = execute_query(
                "SELECT passed FROM quiz_results WHERE user_id = %s AND quiz_id = %s",
                (current_user['id'], quiz['id']),
                fetch_one=True
            )
            
            if quiz_result and quiz_result['passed']:
                response['quiz_completed'] = True
                response['module_completed'] = True
                
                # Award additional points for module completion
                module_points = award_points(
                    current_user['id'],
                    app.config['POINTS_FOR_COMPLETION'] * 2,  # Bonus for module completion
                    f"Completed module {content['module_id']}"
                )
                response['module_points_awarded'] = app.config['POINTS_FOR_COMPLETION'] * 2
                
                if module_points.get('badges_awarded'):
                    if 'badges_awarded' not in response:
                        response['badges_awarded'] = []
                    response['badges_awarded'].extend(module_points['badges_awarded'])

        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"Error completing content: {str(e)}")
        return jsonify({'message': 'Error completing content'}), 500
@app.route('/modules/<int:module_id>/quiz/attempt', methods=['POST'])
@token_required
def attempt_module_quiz(current_user, module_id):
    """Attempt the quiz for a module"""
    try:
        # Verify module exists
        module = execute_query(
            "SELECT * FROM modules WHERE id = %s AND is_active = TRUE",
            (module_id,),
            fetch_one=True
        )
        if not module:
            return jsonify({'message': 'Module not found'}), 404

        # Check if user has completed all content
        all_content = execute_query(
            "SELECT id FROM module_content WHERE module_id = %s",
            (module_id,),
            fetch_all=True
        )
        
        completed_content = execute_query(
            "SELECT COUNT(DISTINCT content_id) as count FROM user_progress "
            "WHERE user_id = %s AND status = 'completed' "
            "AND content_id IN (SELECT id FROM module_content WHERE module_id = %s)",
            (current_user['id'], module_id),
            fetch_one=True
        )['count']

        if completed_content < len(all_content):
            return jsonify({
                'message': 'You must complete all module content before attempting the quiz',
                'content_completed': completed_content,
                'content_required': len(all_content)
            }), 403

        # Get the quiz
        quiz = execute_query(
            "SELECT * FROM quizzes WHERE module_id = %s AND is_active = TRUE LIMIT 1",
            (module_id,),
            fetch_one=True
        )
        if not quiz:
            return jsonify({'message': 'No quiz available for this module'}), 404

        # Check if user has already passed this quiz
        existing_result = execute_query(
            "SELECT * FROM quiz_results WHERE user_id = %s AND quiz_id = %s AND passed = TRUE",
            (current_user['id'], quiz['id']),
            fetch_one=True
        )
        if existing_result:
            return jsonify({
                'message': 'You have already passed this quiz',
                'quiz_id': quiz['id'],
                'passed': True,
                'previous_score': existing_result['score'],
                'previous_percentage': existing_result['percentage']
            }), 200

        # Get quiz questions (without answers)
        questions = execute_query(
            "SELECT id, question_text, question_type, options, points "
            "FROM quiz_questions WHERE quiz_id = %s",
            (quiz['id'],),
            fetch_all=True
        )

        return jsonify({
            'quiz_id': quiz['id'],
            'title': quiz['title'],
            'description': quiz['description'],
            'passing_score': quiz['passing_score'],
            'time_limit': quiz['time_limit'],
            'questions': questions,
            'attempts_allowed': quiz.get('attempts_allowed', 3),
            'previous_attempts': execute_query(
                "SELECT COUNT(*) as attempts FROM quiz_results "
                "WHERE user_id = %s AND quiz_id = %s",
                (current_user['id'], quiz['id']),
                fetch_one=True
            )['attempts']
        })

    except Exception as e:
        app.logger.error(f"Error attempting module quiz: {str(e)}")
        return jsonify({'message': 'Error attempting quiz'}), 500

@app.route('/modules/<int:module_id>/quiz/submit', methods=['POST'])
@token_required
def submit_module_quiz(current_user, module_id):
    """Submit quiz answers for a module"""
    try:
        data = request.get_json()
        if 'answers' not in data or not isinstance(data['answers'], dict):
            return jsonify({'message': 'Answers are required'}), 400

        # Verify module exists
        module = execute_query(
            "SELECT * FROM modules WHERE id = %s AND is_active = TRUE",
            (module_id,),
            fetch_one=True
        )
        if not module:
            return jsonify({'message': 'Module not found'}), 404

        # Get the quiz
        quiz = execute_query(
            "SELECT * FROM quizzes WHERE module_id = %s AND is_active = TRUE LIMIT 1",
            (module_id,),
            fetch_one=True
        )
        if not quiz:
            return jsonify({'message': 'No quiz available for this module'}), 404

        # Get all questions for this quiz
        questions = execute_query(
            "SELECT id, question_text, correct_answer, points FROM quiz_questions "
            "WHERE quiz_id = %s",
            (quiz['id'],),
            fetch_all=True
        )

        # Calculate score
        total_score = 0
        max_score = sum(q['points'] for q in questions)
        correct_answers = {}
        user_answers = data['answers']

        for question in questions:
            correct_answers[str(question['id'])] = question['correct_answer']
            if str(question['id']) in user_answers and user_answers[str(question['id'])] == question['correct_answer']:
                total_score += question['points']

        percentage = (total_score / max_score) * 100 if max_score > 0 else 0
        passed = percentage >= quiz['passing_score']

        # Save quiz result
        execute_query(
            "INSERT INTO quiz_results (user_id, quiz_id, score, max_score, "
            "percentage, passed, answers, correct_answers, completed_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                current_user['id'], quiz['id'], total_score, max_score,
                percentage, passed, json.dumps(user_answers), json.dumps(correct_answers),
                datetime.now(timezone.utc)
            )
        )

        response = {
            'message': 'Quiz submitted successfully',
            'quiz_id': quiz['id'],
            'score': total_score,
            'max_score': max_score,
            'percentage': percentage,
            'passed': passed,
            'badges_awarded': [],
            'points_awarded': 0
        }

        if passed:
            # Award points for passing the quiz
            points_result = award_points(
                current_user['id'],
                app.config['POINTS_FOR_QUIZ'],
                f"Passed quiz for module {module_id} with score {percentage}%"
            )
            response['points_awarded'] = app.config['POINTS_FOR_QUIZ']
            
            if points_result.get('badges_awarded'):
                response['badges_awarded'] = points_result['badges_awarded']

            # Check for quiz-specific badges
            quiz_badges = check_quiz_badges(current_user['id'], quiz['id'], percentage)
            if quiz_badges:
                if 'badges_awarded' not in response:
                    response['badges_awarded'] = []
                response['badges_awarded'].extend(quiz_badges)
            
            # Update leaderboard
            update_leaderboard(current_user['id'])
            response['leaderboard_update'] = True

        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"Error submitting module quiz: {str(e)}")
        return jsonify({'message': 'Error submitting quiz'}), 500
@app.route('/modules/<int:module_id>/next', methods=['GET'])
@token_required
def get_next_module(current_user, module_id):
    """Get the next module if current one is completed"""
    try:
        # Verify current module exists
        current_module = execute_query(
            "SELECT * FROM modules WHERE id = %s AND is_active = TRUE",
            (module_id,),
            fetch_one=True
        )
        if not current_module:
            return jsonify({'message': 'Current module not found'}), 404

        # Check if current module is completed
        # 1. Check all content is completed
        all_content = execute_query(
            "SELECT id FROM module_content WHERE module_id = %s",
            (module_id,),
            fetch_all=True
        )
        
        completed_content = execute_query(
            "SELECT COUNT(DISTINCT content_id) as count FROM user_progress "
            "WHERE user_id = %s AND status = 'completed' "
            "AND content_id IN (SELECT id FROM module_content WHERE module_id = %s)",
            (current_user['id'], module_id),
            fetch_one=True
        )['count']

        if completed_content < len(all_content):
            return jsonify({
                'message': 'You must complete all module content first',
                'content_completed': completed_content,
                'content_required': len(all_content)
            }), 403

        # 2. Check quiz is passed (if module has quiz)
        quiz = execute_query(
            "SELECT id FROM quizzes WHERE module_id = %s AND is_active = TRUE LIMIT 1",
            (module_id,),
            fetch_one=True
        )
        
        if quiz:
            quiz_result = execute_query(
                "SELECT passed FROM quiz_results WHERE user_id = %s AND quiz_id = %s",
                (current_user['id'], quiz['id']),
                fetch_one=True
            )
            
            if not quiz_result or not quiz_result['passed']:
                return jsonify({
                    'message': 'You must pass the module quiz first',
                    'quiz_passed': False,
                    'quiz_id': quiz['id']
                }), 403

        # Get next module in sequence
        next_module = execute_query(
            "SELECT id, title FROM modules "
            "WHERE is_active = TRUE AND id > %s "
            "ORDER BY id ASC LIMIT 1",
            (module_id,),
            fetch_one=True
        )

        if not next_module:
            return jsonify({
                'message': 'Current module completed - this is the last module',
                'next_module': None,
                'all_modules_completed': True
            }), 200

        return jsonify({
            'message': 'Module completed - next module available',
            'next_module': next_module,
            'all_modules_completed': False
        })

    except Exception as e:
        app.logger.error(f"Error getting next module: {str(e)}")
        return jsonify({'message': 'Error checking module progression'}), 500
    
@app.route('/content/<int:content_id>/questions', methods=['POST'])
@token_required
@trainer_required
def add_content_question(current_user, content_id):
    """Add a question to a specific content item"""
    
    try:
        app.logger.info(f"Received request for content_id: {content_id}, user_id: {current_user['id']}")
        app.logger.info(f"Request JSON: {request.get_json()}")

        # Check if request has JSON data
        if not request.is_json:
            app.logger.error("Request is not JSON")
            return jsonify({'message': 'Request must be JSON'}), 400

        question = request.get_json()
        
        # Validate that we received a single question object
        if not isinstance(question, dict):
            app.logger.error("Request body is not a question object")
            return jsonify({'message': 'Request body must be a single question object'}), 400

        # Verify the trainer owns this content
        result = execute_query(
            "SELECT 1 FROM module_content mc "
            "JOIN modules m ON mc.module_id = m.id "
            "WHERE mc.id = %s AND m.created_by = %s",
            (content_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            app.logger.error(f"Content {content_id} not found or not owned by user {current_user['id']}")
            return jsonify({'message': 'Content not found or unauthorized'}), 404

        # Validate question fields
        required_fields = ['question_text', 'question_type', 'options', 'correct_answer']
        missing_fields = [field for field in required_fields if field not in question]
        if missing_fields:
            app.logger.error(f"Question missing fields: {missing_fields}")
            return jsonify({
                'message': f'Question missing required fields: {", ".join(missing_fields)}'
            }), 400
            
        if question['question_type'] not in ['multiple_choice', 'true_false', 'short_answer']:
            app.logger.error(f"Invalid question_type '{question['question_type']}'")
            return jsonify({
                'message': 'Invalid question_type'
            }), 400
            
        if not isinstance(question['options'], list):
            app.logger.error("Options is not an array")
            return jsonify({
                'message': 'Options must be an array'
            }), 400

        # Add question to the content
        execute_query(
            "INSERT INTO content_questions (content_id, question_text, question_type, options, correct_answer, points) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                content_id, 
                question['question_text'], 
                question['question_type'],
                json.dumps(question['options']), 
                question['correct_answer'],
                question.get('points', 1)
            )
        )

        app.logger.info(f"Successfully added question to content_id {content_id}")
        return jsonify({
            'message': 'Successfully added question',
            'content_id': content_id
        }), 201

    except Exception as e:
        app.logger.error(f"Error adding question to content {content_id}: {str(e)}", exc_info=True)
        return jsonify({'message': 'Error adding question'}), 500
@app.route('/user/certificates/preview/<string:cert_type>/<int:item_id>', methods=['GET'])
@token_required
def preview_certificate(current_user, cert_type, item_id):
    certificate_data = None

    if cert_type == 'module':
        module_data = execute_query(
            "SELECT m.id, m.title, m.description, MAX(up.completed_at) as completed_at "
            "FROM modules m "
            "JOIN module_content mc ON m.id = mc.module_id "
            "JOIN user_progress up ON mc.id = up.content_id "
            "WHERE up.user_id = %s AND up.status = 'completed' AND m.id = %s "
            "GROUP BY m.id, m.title, m.description "
            "HAVING COUNT(mc.id) = SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END)",
            (current_user['id'], item_id),
            fetch_one=True
        )

        if not module_data:
            return jsonify({'message': 'Module not completed'}), 400

        certificate_data = {
            'type': 'module',
            'certificate_id': f"MOD-{module_data['id']}-{current_user['id']}",
            'title': module_data['title'],
            'user_name': f"{current_user['first_name']} {current_user['last_name']}",
            'completed_at': module_data['completed_at'].strftime('%B %d, %Y'),
            'description': f"has successfully completed the {module_data['title']} training module.",
        }

    elif cert_type == 'quiz':
        quiz_data = execute_query(
            "SELECT q.id, q.title, qr.score, qr.max_score, qr.percentage, qr.completed_at "
            "FROM quiz_results qr "
            "JOIN quizzes q ON qr.quiz_id = q.id "
            "WHERE qr.user_id = %s AND qr.quiz_id = %s AND qr.passed = TRUE "
            "ORDER BY qr.completed_at DESC LIMIT 1",
            (current_user['id'], item_id),
            fetch_one=True
        )

        if not quiz_data:
            return jsonify({'message': 'Quiz not passed'}), 400

        certificate_data = {
            'type': 'quiz',
            'certificate_id': f"QUIZ-{quiz_data['id']}-{current_user['id']}",
            'title': quiz_data['title'],
            'user_name': f"{current_user['first_name']} {current_user['last_name']}",
            'completed_at': quiz_data['completed_at'].strftime('%B %d, %Y'),
            'description': f"has successfully passed the {quiz_data['title']} quiz.",
            'score': quiz_data['score'],
            'max_score': quiz_data['max_score'],
            'percentage': quiz_data['percentage']
        }

    else:
        return jsonify({'message': 'Invalid certificate type'}), 400

    pdf_buffer = generate_certificate_pdf(certificate_data, preview=True)

    return send_file(
        pdf_buffer,
        as_attachment=False,
        download_name=f"certificate_preview_{cert_type}_{item_id}.pdf",
        mimetype='application/pdf'
    )

@app.route('/user/certificates/download/<string:cert_type>/<int:item_id>', methods=['GET'])
@token_required
def download_certificate(current_user, cert_type, item_id):
    certificate_data = None

    if cert_type == 'module':
        module_data = execute_query(
            "SELECT m.id, m.title, m.description, MAX(up.completed_at) as completed_at "
            "FROM modules m "
            "JOIN module_content mc ON m.id = mc.module_id "
            "JOIN user_progress up ON mc.id = up.content_id "
            "WHERE up.user_id = %s AND up.status = 'completed' AND m.id = %s "
            "GROUP BY m.id, m.title, m.description "
            "HAVING COUNT(mc.id) = SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END)",
            (current_user['id'], item_id),
            fetch_one=True
        )

        if not module_data:
            return jsonify({'message': 'Module not completed'}), 400

        certificate_data = {
            'type': 'module',
            'certificate_id': f"MOD-{module_data['id']}-{current_user['id']}",
            'title': module_data['title'],
            'user_name': f"{current_user['first_name']} {current_user['last_name']}",
            'completed_at': module_data['completed_at'].strftime('%B %d, %Y'),
            'description': f"has successfully completed the {module_data['title']} training module.",
        }

    elif cert_type == 'quiz':
        quiz_data = execute_query(
            "SELECT q.id, q.title, qr.score, qr.max_score, qr.percentage, qr.completed_at "
            "FROM quiz_results qr "
            "JOIN quizzes q ON qr.quiz_id = q.id "
            "WHERE qr.user_id = %s AND qr.quiz_id = %s AND qr.passed = TRUE "
            "ORDER BY qr.completed_at DESC LIMIT 1",
            (current_user['id'], item_id),
            fetch_one=True
        )

        if not quiz_data:
            return jsonify({'message': 'Quiz not passed'}), 400

        certificate_data = {
            'type': 'quiz',
            'certificate_id': f"QUIZ-{quiz_data['id']}-{current_user['id']}",
            'title': quiz_data['title'],
            'user_name': f"{current_user['first_name']} {current_user['last_name']}",
            'completed_at': quiz_data['completed_at'].strftime('%B %d, %Y'),
            'description': f"has successfully passed the {quiz_data['title']} quiz.",
            'score': quiz_data['score'],
            'max_score': quiz_data['max_score'],
            'percentage': quiz_data['percentage']
        }

    else:
        return jsonify({'message': 'Invalid certificate type'}), 400

    pdf_buffer = generate_certificate_pdf(certificate_data)

    execute_query(
        "INSERT INTO user_certificates (user_id, certificate_type, item_id, "
        "certificate_id, generated_at) "
        "VALUES (%s, %s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE generated_at = %s",
        (
            current_user['id'], cert_type, item_id,
            certificate_data['certificate_id'], datetime.now(timezone.utc),
            datetime.now(timezone.utc)
        )
    )

    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"certificate_{cert_type}_{item_id}.pdf",
        mimetype='application/pdf'
    )

@app.route('/user/certificates/history', methods=['GET'])
@token_required
def get_certificate_history(current_user):
    certificates = execute_query(
        "SELECT uc.id, uc.certificate_type, uc.item_id, uc.certificate_id, "
        "uc.generated_at, "
        "CASE "
        "WHEN uc.certificate_type = 'module' THEN m.title "
        "WHEN uc.certificate_type = 'quiz' THEN q.title "
        "END as title "
        "FROM user_certificates uc "
        "LEFT JOIN modules m ON uc.certificate_type = 'module' AND uc.item_id = m.id "
        "LEFT JOIN quizzes q ON uc.certificate_type = 'quiz' AND uc.item_id = q.id "
        "WHERE uc.user_id = %s "
        "ORDER BY uc.generated_at DESC",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify(dict_to_json_serializable(certificates))

@app.route('/progress', methods=['POST'])
@token_required
def update_progress(current_user):
    data = request.get_json()
    required_fields = ['content_id', 'status']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Content ID and status are required'}), 400

    result = execute_query(
        "SELECT 1 FROM module_content WHERE id = %s",
        (data['content_id'],),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Content not found'}), 404

    progress = execute_query(
        "SELECT * FROM user_progress WHERE user_id = %s AND content_id = %s",
        (current_user['id'], data['content_id']),
        fetch_one=True
    )

    if progress:
        execute_query(
            "UPDATE user_progress SET status = %s, current_position = %s, "
            "completed_at = %s, last_accessed = %s, attempts = %s, score = %s "
            "WHERE user_id = %s AND content_id = %s",
            (
                data['status'], data.get('current_position'),
                datetime.now(timezone.utc) if data['status'] == 'completed' else None,
                datetime.now(timezone.utc), data.get('attempts', 0),
                data.get('score'), current_user['id'], data['content_id']
            )
        )
    else:
        execute_query(
            "INSERT INTO user_progress (user_id, content_id, status, started_at, "
            "completed_at, last_accessed, current_position, attempts, score) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                current_user['id'], data['content_id'], data['status'],
                datetime.now(timezone.utc),
                datetime.now(timezone.utc) if data['status'] == 'completed' else None,
                datetime.now(timezone.utc), data.get('current_position'),
                data.get('attempts', 0), data.get('score')
            )
        )

    if data['status'] == 'completed':
        points_result = award_points(
            current_user['id'],
            app.config['POINTS_FOR_COMPLETION'],
            f"Completed content {data['content_id']}"
        )

        if current_user.get('employer_id'):
            update_leaderboard(current_user['id'], current_user['employer_id'])

    response = {'message': 'Progress updated successfully'}
    if data['status'] == 'completed':
        response['points_awarded'] = app.config['POINTS_FOR_COMPLETION']
        if points_result.get('badges_awarded'):
            response['badges_awarded'] = points_result['badges_awarded']

    return jsonify(response)

@app.route('/progress/summary', methods=['GET'])
@token_required
def get_progress_summary(current_user):
    result = execute_query(
        "SELECT COUNT(*) as total_modules FROM modules WHERE is_active = TRUE",
        fetch_one=True
    )
    total_modules = result['total_modules']

    result = execute_query(
        "SELECT COUNT(DISTINCT m.id) as completed_modules FROM modules m "
        "JOIN module_content mc ON m.id = mc.module_id "
        "JOIN user_progress up ON mc.id = up.content_id "
        "WHERE up.user_id = %s AND up.status = 'completed' "
        "GROUP BY m.id "
        "HAVING COUNT(mc.id) = SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END)",
        (current_user['id'],),
        fetch_all=True
    )
    completed_modules = len(result)

    result = execute_query(
        "SELECT COALESCE(SUM(points), 0) as total_points FROM user_points WHERE user_id = %s",
        (current_user['id'],),
        fetch_one=True
    )
    total_points = result['total_points']

    result = execute_query(
        "SELECT COUNT(*) as badges_count FROM user_badges WHERE user_id = %s",
        (current_user['id'],),
        fetch_one=True
    )
    badges_count = result['badges_count']

    recent_activity = execute_query(
        "SELECT up.content_id, mc.title as content_title, m.title as module_title, "
        "up.status, up.last_accessed, up.score "
        "FROM user_progress up "
        "JOIN module_content mc ON up.content_id = mc.id "
        "JOIN modules m ON mc.module_id = m.id "
        "WHERE up.user_id = %s "
        "ORDER BY up.last_accessed DESC "
        "LIMIT 5",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify({
        'total_modules': total_modules,
        'completed_modules': completed_modules,
        'completion_percentage': int((completed_modules / total_modules * 100)) if total_modules > 0 else 0,
        'total_points': total_points,
        'badges_count': badges_count,
        'recent_activity': dict_to_json_serializable(recent_activity)
    })
@app.route('/trainer/reports', methods=['GET'])
@token_required
@trainer_required
def generate_trainer_reports(current_user):
    """Generate various reports for trainers"""
    try:
        # First log that the endpoint was reached successfully
        app.logger.info(f"Trainer report requested by user {current_user['id']}")
        
        report_type = request.args.get('type', 'module_progress') or request.args.get('reportType', 'module_progress')
        module_id = request.args.get('module_id') 
        time_range = request.args.get('time_range', 'all') or request.args.get('timeRange', 'all')
        format = request.args.get('format', 'json')  # json or pdf

        # Log the parameters received
        app.logger.info(f"Report params - type: {report_type}, module_id: {module_id}, time_range: {time_range}, format: {format}")

        # Validate time range
        time_ranges = {
            'week': timedelta(days=7),
            'month': timedelta(days=30),
            'quarter': timedelta(days=90),
            'year': timedelta(days=365),
            'all': None
        }
        
        if time_range not in time_ranges:
            return jsonify({'message': 'Invalid time range'}), 400

        time_delta = time_ranges[time_range]

        reports = {}

        # Module Progress Report
        if report_type == 'module_progress':
            if module_id:
                # Single module report
                module = execute_query(
                    "SELECT * FROM modules WHERE id = %s AND created_by = %s",
                    (module_id, current_user['id']),
                    fetch_one=True
                )
                if not module:
                    return jsonify({'message': 'Module not found or unauthorized'}), 404

                # Get learner progress for this module
                query = """
                    SELECT u.id as user_id, u.first_name, u.last_name, u.email,
                    COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.content_id END) as completed_content,
                    COUNT(DISTINCT mc.id) as total_content,
                    MAX(up.completed_at) as last_completed
                    FROM users u
                    CROSS JOIN module_content mc ON mc.module_id = %s
                    LEFT JOIN user_progress up ON (up.user_id = u.id AND up.content_id = mc.id)
                    WHERE u.id IN (
                        SELECT DISTINCT up.user_id FROM user_progress up
                        JOIN module_content mc ON up.content_id = mc.id
                        WHERE mc.module_id = %s
                    )
                    GROUP BY u.id, u.first_name, u.last_name, u.email
                """
                params = (module_id, module_id)
                
                if start_date:
                    query += " HAVING MAX(up.completed_at) >= %s"
                    params += (start_date,)

                learner_progress = execute_query(query, params, fetch_all=True)

                reports['module'] = module
                reports['learner_progress'] = learner_progress
            else:
                # All modules report
                modules = execute_query(
                    "SELECT m.id, m.title, m.category, m.created_at, "
                    "COUNT(DISTINCT mc.id) as total_content, "
                    "COUNT(DISTINCT up.user_id) as total_learners, "
                    "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completed_learners "
                    "FROM modules m "
                    "LEFT JOIN module_content mc ON m.id = mc.module_id "
                    "LEFT JOIN user_progress up ON mc.id = up.content_id "
                    "WHERE m.created_by = %s "
                    "GROUP BY m.id, m.title, m.category, m.created_at "
                    "ORDER BY m.created_at DESC",
                    (current_user['id'],),
                    fetch_all=True
                )

                reports['modules'] = modules

        # Learner Activity Report
        elif report_type == 'learner_activity':
            query = """
                SELECT u.id, u.first_name, u.last_name, u.email, u.last_login,
                COUNT(DISTINCT up.content_id) as total_content_accessed,
                COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.content_id END) as completed_content,
                COUNT(DISTINCT qr.quiz_id) as quizzes_taken,
                COUNT(DISTINCT CASE WHEN qr.passed = TRUE THEN qr.quiz_id END) as quizzes_passed,
                COALESCE(SUM(up.score), 0) as total_score
                FROM users u
                LEFT JOIN user_progress up ON u.id = up.user_id
                LEFT JOIN module_content mc ON up.content_id = mc.id
                LEFT JOIN modules m ON mc.module_id = m.id
                LEFT JOIN quiz_results qr ON (u.id = qr.user_id)
                WHERE m.created_by = %s
                GROUP BY u.id, u.first_name, u.last_name, u.email, u.last_login
            """
            params = (current_user['id'],)
            
            if start_date:
                query += " HAVING MAX(up.last_accessed) >= %s OR MAX(qr.completed_at) >= %s"
                params += (start_date, start_date)

            learner_activity = execute_query(query, params, fetch_all=True)
            reports['learner_activity'] = learner_activity

        # Quiz Performance Report
        elif report_type == 'quiz_performance':
            quizzes = execute_query(
                "SELECT q.id, q.title, m.title as module_title, "
                "COUNT(DISTINCT qr.user_id) as total_attempts, "
                "COUNT(DISTINCT CASE WHEN qr.passed = TRUE THEN qr.user_id END) as passed_attempts, "
                "AVG(qr.percentage) as avg_score, "
                "MIN(qr.percentage) as min_score, "
                "MAX(qr.percentage) as max_score "
                "FROM quizzes q "
                "JOIN modules m ON q.module_id = m.id "
                "LEFT JOIN quiz_results qr ON q.id = qr.quiz_id "
                "WHERE m.created_by = %s "
                "GROUP BY q.id, q.title, m.title "
                "ORDER BY m.title, q.title",
                (current_user['id'],),
                fetch_all=True
            )

            # Add question statistics for each quiz
            for quiz in quizzes:
                questions = execute_query(
                    "SELECT qq.id, qq.question_text, qq.question_type, "
                    "COUNT(qr.id) as total_attempts, "
                    "AVG(CASE WHEN JSON_EXTRACT(qr.answers, CONCAT('$.\"', qq.id, '\"')) = qq.correct_answer THEN 1 ELSE 0 END) as correct_rate "
                    "FROM quiz_questions qq "
                    "LEFT JOIN quiz_results qr ON qq.quiz_id = qr.quiz_id "
                    "WHERE qq.quiz_id = %s "
                    "GROUP BY qq.id, qq.question_text, qq.question_type",
                    (quiz['id'],),
                    fetch_all=True
                )
                quiz['questions'] = questions

            reports['quizzes'] = quizzes

        # Completion Rate Report
        elif report_type == 'completion_rate':
            modules = execute_query(
                "SELECT m.id, m.title, "
                "COUNT(DISTINCT mc.id) as total_content, "
                "COUNT(DISTINCT up.user_id) as total_learners, "
                "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completed_learners "
                "FROM modules m "
                "LEFT JOIN module_content mc ON m.id = mc.module_id "
                "LEFT JOIN user_progress up ON mc.id = up.content_id "
                "WHERE m.created_by = %s "
                "GROUP BY m.id, m.title "
                "ORDER BY m.title",
                (current_user['id'],),
                fetch_all=True
            )

            # Calculate completion rates
            for module in modules:
                if module['total_learners'] > 0:
                    module['completion_rate'] = round((module['completed_learners'] / module['total_learners']) * 100, 2)
                else:
                    module['completion_rate'] = 0

            reports['modules'] = modules

        else:
            return jsonify({'message': 'Invalid report type'}), 400

        # Generate PDF if requested
        if format == 'pdf':
            pdf_buffer = generate_report_pdf(reports, report_type, current_user)
            return send_file(
                pdf_buffer,
                as_attachment=True,
                download_name=f"{report_type}_report_{datetime.now().strftime('%Y%m%d')}.pdf",
                mimetype='application/pdf'
            )

        return jsonify({
            'report_type': report_type,
            'time_range': time_range,
            'data': reports
        })

    except Exception as e:
        app.logger.error(f"Error generating report: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'Error generating report',
            'error': str(e),
            'user_id': current_user.get('id'),
            'user_role': current_user.get('role')
        }), 500

def generate_report_pdf(report_data, report_type, current_user):
    """Generate a PDF report from the report data"""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72,
                           topMargin=72, bottomMargin=18)

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Center', alignment=1))
    styles.add(ParagraphStyle(name='Title', fontSize=18, alignment=1, spaceAfter=20))
    styles.add(ParagraphStyle(name='Subtitle', fontSize=14, alignment=1, spaceAfter=20))
    styles.add(ParagraphStyle(name='Body', fontSize=12, alignment=1, spaceAfter=12))
    styles.add(ParagraphStyle(name='TableHeader', fontSize=12, alignment=1, textColor=colors.white, backColor=colors.HexColor('#4472C4')))
    styles.add(ParagraphStyle(name='TableText', fontSize=10, alignment=1))

    elements = []

    # Add report title
    report_titles = {
        'module_progress': 'Module Progress Report',
        'learner_activity': 'Learner Activity Report',
        'quiz_performance': 'Quiz Performance Report',
        'completion_rate': 'Completion Rate Report'
    }
    
    elements.append(Paragraph(report_titles.get(report_type, 'Training Report'), styles['Title']))
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y')}", styles['Subtitle']))
    elements.append(Paragraph(f"Trainer: {current_user['first_name']} {current_user['last_name']}", styles['Body']))
    elements.append(Spacer(1, 0.5*inch))

    # Module Progress Report
    if report_type == 'module_progress':
        if 'module' in report_data:
            # Single module report
            module = report_data['module']
            elements.append(Paragraph(f"Module: {module['title']}", styles['Subtitle']))
            elements.append(Paragraph(f"Category: {module.get('category', 'N/A')}", styles['Body']))
            elements.append(Spacer(1, 0.25*inch))

            # Learner progress table
            data = [['Learner', 'Completed', 'Total', 'Completion %', 'Last Activity']]
            for progress in report_data['learner_progress']:
                completion_pct = (progress['completed_content'] / progress['total_content']) * 100 if progress['total_content'] > 0 else 0
                last_activity = progress['last_completed'].strftime('%Y-%m-%d') if progress['last_completed'] else 'N/A'
                data.append([
                    f"{progress['first_name']} {progress['last_name']}",
                    str(progress['completed_content']),
                    str(progress['total_content']),
                    f"{completion_pct:.1f}%",
                    last_activity
                ])

            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
           
            elements.append(table)

        else:
            # All modules report
            data = [['Module', 'Category', 'Content Items', 'Learners', 'Completed', 'Completion %']]
            for module in report_data['modules']:
                completion_pct = (module['completed_learners'] / module['total_learners']) * 100 if module['total_learners'] > 0 else 0
                data.append([
                    module['title'],
                    module.get('category', 'N/A'),
                    str(module['total_content']),
                    str(module['total_learners']),
                    str(module['completed_learners']),
                    f"{completion_pct:.1f}%"
                ])

            table = Table(data)
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(table)

    # Learner Activity Report
    elif report_type == 'learner_activity':
        data = [['Learner', 'Content Accessed', 'Completed', 'Quizzes Taken', 'Quizzes Passed', 'Total Score']]
        for activity in report_data['learner_activity']:
            data.append([
                f"{activity['first_name']} {activity['last_name']}",
                str(activity['total_content_accessed']),
                str(activity['completed_content']),
                str(activity['quizzes_taken']),
                str(activity['quizzes_passed']),
                str(activity['total_score'])
            ])

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    # Quiz Performance Report
    elif report_type == 'quiz_performance':
        for quiz in report_data['quizzes']:
            elements.append(Paragraph(f"Quiz: {quiz['title']}", styles['Subtitle']))
            elements.append(Paragraph(f"Module: {quiz['module_title']}", styles['Body']))
            elements.append(Spacer(1, 0.25*inch))

            # Quiz summary
            summary_data = [
                ['Total Attempts', str(quiz['total_attempts'])],
                ['Passed Attempts', str(quiz['passed_attempts'])],
                ['Pass Rate', f"{quiz['passed_attempts'] / quiz['total_attempts'] * 100:.1f}%" if quiz['total_attempts'] > 0 else 'N/A'],
                ['Average Score', f"{quiz['avg_score']:.1f}%"],
                ['Minimum Score', f"{quiz['min_score']:.1f}%"],
                ['Maximum Score', f"{quiz['max_score']:.1f}%"]
            ]
            
            summary_table = Table(summary_data, colWidths=[2*inch, 2*inch])
            summary_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 0.25*inch))

            # Question performance
            elements.append(Paragraph("Question Performance:", styles['Subtitle']))
            question_data = [['Question', 'Type', 'Attempts', 'Correct Rate']]
            for question in quiz['questions']:
                question_data.append([
                    question['question_text'],
                    question['question_type'],
                    str(question['total_attempts']),
                    f"{question['correct_rate'] * 100:.1f}%" if question['total_attempts'] > 0 else 'N/A'
                ])

            question_table = Table(question_data)
            question_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(question_table)
            elements.append(Spacer(1, 0.5*inch))

    # Completion Rate Report
    elif report_type == 'completion_rate':
        data = [['Module', 'Content Items', 'Learners', 'Completed', 'Completion %']]
        for module in report_data['modules']:
            completion_pct = (module['completed_learners'] / module['total_learners']) * 100 if module['total_learners'] > 0 else 0
            data.append([
                module['title'],
                str(module['total_content']),
                str(module['total_learners']),
                str(module['completed_learners']),
                f"{completion_pct:.1f}%"
            ])

        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4472C4')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

    # Add footer
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Generated by Hospitality Training Platform", styles['Body']))

    doc.build(elements)
    buffer.seek(0)
    return buffer
@app.route('/trainer/dashboard', methods=['GET'])
@token_required
@trainer_required
def trainer_dashboard(current_user):
    """Get trainer dashboard statistics"""
    try:
        # Get basic stats
        stats = {
            'total_modules': 0,
            'active_modules': 0,
            'total_learners': 0,
            'recent_modules': [],
            'recent_quiz_results': [],
            'assignment_stats': []
        }

        # Get module counts
        result = execute_query(
            "SELECT COUNT(*) as count FROM modules WHERE created_by = %s",
            (current_user['id'],),
            fetch_one=True
        )
        if result:
            stats['total_modules'] = result['count']

        result = execute_query(
            "SELECT COUNT(*) as count FROM modules WHERE created_by = %s AND is_active = TRUE",
            (current_user['id'],),
            fetch_one=True
        )
        if result:
            stats['active_modules'] = result['count']

        # Get learner count
        result = execute_query(
            "SELECT COUNT(DISTINCT up.user_id) as count "
            "FROM user_progress up "
            "JOIN module_content mc ON up.content_id = mc.id "
            "JOIN modules m ON mc.module_id = m.id "
            "WHERE m.created_by = %s",
            (current_user['id'],),
            fetch_one=True
        )
        if result:
            stats['total_learners'] = result['count']

        # Get recent modules
        stats['recent_modules'] = execute_query(
            "SELECT m.id, m.title, m.created_at, "
            "COUNT(DISTINCT up.user_id) as learners "
            "FROM modules m "
            "LEFT JOIN module_content mc ON m.id = mc.module_id "
            "LEFT JOIN user_progress up ON mc.id = up.content_id "
            "WHERE m.created_by = %s "
            "GROUP BY m.id, m.title, m.created_at "
            "ORDER BY m.created_at DESC "
            "LIMIT 5",
            (current_user['id'],),
            fetch_all=True
        )

        # Get recent quiz results
        stats['recent_quiz_results'] = execute_query(
            "SELECT qr.id, qr.score, qr.completed_at, "
            "q.title as quiz_title, u.first_name, u.last_name "
            "FROM quiz_results qr "
            "JOIN quizzes q ON qr.quiz_id = q.id "
            "JOIN users u ON qr.user_id = u.id "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE m.created_by = %s "
            "ORDER BY qr.completed_at DESC "
            "LIMIT 5",
            (current_user['id'],),
            fetch_all=True
        )

        return jsonify(stats)

    except Exception as e:
        app.logger.error(f"Error fetching trainer dashboard: {str(e)}")
        return jsonify({
            'message': 'Error fetching dashboard data',
            'error': str(e)
        }), 500
# Add these to your Flask app (api.py)

@app.route('/trainer/quizzes', methods=['GET'])
@token_required
@trainer_required
def get_trainer_quizzes(current_user):
    """Get all quizzes created by this trainer"""
    try:
        quizzes = execute_query(
            "SELECT q.id, q.title, q.description, q.passing_score, q.time_limit, "
            "q.is_active, q.created_at, m.title as module_title "
            "FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE m.created_by = %s "
            "ORDER BY q.created_at DESC",
            (current_user['id'],),
            fetch_all=True
        )
        
        return jsonify(dict_to_json_serializable(quizzes))
    except Exception as e:
        app.logger.error(f"Error fetching trainer quizzes: {str(e)}")
        return jsonify({'message': 'Error fetching quizzes'}), 500

@app.route('/trainer/quizzes/<int:quiz_id>/questions', methods=['GET'])
@token_required
@trainer_required
def get_quiz_questions(current_user, quiz_id):
    """Get all questions for a specific quiz (with answers)"""
    try:
        # Verify the trainer owns this quiz
        result = execute_query(
            "SELECT 1 FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE q.id = %s AND m.created_by = %s",
            (quiz_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Quiz not found or unauthorized'}), 404

        questions = execute_query(
            "SELECT id, question_text, question_type, "
            "COUNT(qr.id) as total_attempts, "
            "AVG(CASE WHEN JSON_EXTRACT(qr.answers, CONCAT('$.\"', qq.id, '\"')) = qq.correct_answer THEN 1 ELSE 0 END) as correct_rate "
            "FROM quiz_questions qq "
            "LEFT JOIN quiz_results qr ON qq.quiz_id = qr.quiz_id "
            "WHERE qq.quiz_id = %s "
            "GROUP BY qq.id, qq.question_text, qq.question_type",
            (quiz_id,),
            fetch_all=True
        )
        quiz['questions'] = questions

        return jsonify(dict_to_json_serializable(questions))
    except Exception as e:
        app.logger.error(f"Error fetching quiz questions: {str(e)}")
        return jsonify({'message': 'Error fetching questions'}), 500

@app.route('/trainer/quizzes/<int:quiz_id>/questions', methods=['POST'])
@token_required
@trainer_required
def add_quiz_question(current_user, quiz_id):
    """Add a new question to a quiz"""

    try:
        data = request.get_json()
        required_fields = ['question_text', 'question_type', 'options', 'correct_answer']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        # Verify the trainer owns this quiz
        result = execute_query(
            "SELECT 1 FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE q.id = %s AND m.created_by = %s",
            (quiz_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Quiz not found or unauthorized'}), 404

        # Validate question data
        if data['question_type'] not in ['multiple_choice', 'true_false', 'short_answer']:
            return jsonify({'message': 'Invalid question type'}), 400

        if not isinstance(data['options'], list):
            return jsonify({'message': 'Options must be an array'}), 400

        if data['question_type'] == 'multiple_choice' and len(data['options']) < 2:
            return jsonify({'message': 'Multiple choice questions need at least 2 options'}), 400

        if data['question_type'] == 'true_false' and data['options'] != ['True', 'False']:
            return jsonify({'message': 'True/False questions must have exactly "True" and "False" as options'}), 400

        # Add the question
        question_id = execute_query(
            "INSERT INTO quiz_questions (quiz_id, question_text, question_type, "
            "options, correct_answer, points) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                quiz_id, question['question_text'], question['question_type'],
                json.dumps(question['options']), question['correct_answer'],
                question.get('points', 1)
            ),
            lastrowid=True
        )

        return jsonify({
            'message': 'Question added successfully',
            'question_id': question_id
        }), 201
    except Exception as e:
        app.logger.error(f"Error adding quiz question: {str(e)}")
        return jsonify({'message': 'Error adding question'}), 500

@app.route('/trainer/quizzes/<int:quiz_id>/assign', methods=['POST'])
@token_required
@trainer_required
def assign_quiz(current_user, quiz_id):
    """Assign a quiz to learners"""
    try:
        data = request.get_json()
        required_fields = ['assignment_type']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'Assignment type is required'}), 400

        # Verify the trainer owns this quiz
        result = execute_query(
            "SELECT q.module_id FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE q.id = %s AND m.created_by = %s",
            (quiz_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Quiz not found or unauthorized'}), 404

        module_id = result['module_id']

        # Create assignment
        assignment_id = execute_query(
            "INSERT INTO assignments (module_id, assigned_by, assignment_type, "
            "individual_id, department_id, employer_id, due_date, is_mandatory, notes) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                module_id, current_user['id'], data['assignment_type'],
                data.get('individual_id'), data.get('department_id'),
                data.get('employer_id'), data.get('due_date'),
                data.get('is_mandatory', True), data.get('notes')
            ),
            lastrowid=True
        )

        return jsonify({
            'message': 'Quiz assigned successfully',
            'assignment_id': assignment_id
        }), 201
    except Exception as e:
        app.logger.error(f"Error assigning quiz: {str(e)}")
        return jsonify({'message': 'Error assigning quiz'}), 500
    
@app.route('/trainer/modules', methods=['GET'])
@token_required
@trainer_required
def trainer_modules(current_user):
    """Get modules created by this trainer"""
    try:
        modules = execute_query(
            "SELECT id, title, description, category, difficulty_level, "
            "estimated_duration, is_active, created_at, updated_at "
            "FROM modules WHERE created_by = %s ORDER BY created_at DESC",
            (current_user['id'],),
            fetch_all=True
        )
        return jsonify(dict_to_json_serializable(modules))
    except Exception as e:
        app.logger.error(f"Error fetching trainer modules: {str(e)}")
        return jsonify({'message': 'Error fetching modules'}), 500
@app.route('/trainer/modules/<int:module_id>/stats', methods=['GET'])
@token_required
@trainer_required
def module_stats(current_user, module_id):
    """Get statistics for a specific module"""
    try:
        # Verify the trainer owns this module
        module = execute_query(
            "SELECT id, title, description FROM modules WHERE id = %s AND created_by = %s",
            (module_id, current_user['id']),
            fetch_one=True
        )
        if not module:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

        # Get learner progress
        learner_progress = execute_query(
            "SELECT u.id as user_id, u.first_name, u.last_name, "
            "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.content_id END) as completed_content, "
            "COUNT(DISTINCT mc.id) as total_content "
            "FROM modules m "
            "JOIN module_content mc ON m.id = mc.module_id "
            "LEFT JOIN user_progress up ON (mc.id = up.content_id AND up.user_id = %s) "
            "WHERE m.created_by = %s "
            "GROUP BY u.id, u.first_name, u.last_name",
            (learner_id, current_user['id']),
            fetch_all=True
        )

        # Get quiz results for this module
        quiz_results = execute_query(
            "SELECT qr.*, q.title as quiz_title, u.first_name, u.last_name "
            "FROM quiz_results qr "
            "JOIN quizzes q ON qr.quiz_id = q.id "
            "JOIN users u ON qr.user_id = u.id "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE m.created_by = %s "
            "ORDER BY qr.completed_at DESC",
            (current_user['id'],),
            fetch_all=True
        )

        return jsonify({
            'module': module,
            'learner_progress': learner_progress,
            'quiz_results': quiz_results
        })

    except Exception as e:
        app.logger.error(f"Error fetching module stats: {str(e)}")
        return jsonify({'message': 'Error fetching module statistics'}), 500


@app.route('/trainer/learners', methods=['GET'])
@token_required
@trainer_required
def trainer_learners(current_user):
    """Get learners assigned to this trainer's modules"""
    try:
        learners = execute_query(
            "SELECT DISTINCT u.id, u.email, u.first_name, u.last_name, u.role, "
            "u.employer_id, u.department_id, u.phone, u.profile_picture "
            "FROM users u "
            "JOIN user_progress up ON u.id = up.user_id "
            "JOIN module_content mc ON up.content_id = mc.id "
            "JOIN modules m ON mc.module_id = m.id "
            "WHERE m.created_by = %s",
            (current_user['id'],),
            fetch_all=True
        )
        return jsonify(dict_to_json_serializable(learners))
    except Exception as e:
        app.logger.error(f"Error fetching trainer learners: {str(e)}")
        return jsonify({'message': 'Error fetching learners'}), 500

@app.route('/trainer/learners/<int:learner_id>', methods=['GET'])
@token_required
@trainer_required
def learner_details(current_user, learner_id):
    """Get detailed information about a specific learner"""
    try:
        # Verify the trainer has modules assigned to this learner
        learner = execute_query(
            "SELECT u.* FROM users u "
            "JOIN user_progress up ON u.id = up.user_id "
            "JOIN module_content mc ON up.content_id = mc.id "
            "JOIN modules m ON mc.module_id = m.id "
            "WHERE m.created_by = %s AND u.id = %s "
            "LIMIT 1",
            (current_user['id'], learner_id),
            fetch_one=True
        )
        if not learner:
            return jsonify({'message': 'Learner not found or unauthorized'}), 404

        # Get modules progress
        modules_progress = execute_query(
            "SELECT m.id, m.title, "
            "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.content_id END) as completed_content, "
            "COUNT(DISTINCT mc.id) as total_content "
            "FROM modules m "
            "JOIN module_content mc ON m.id = mc.module_id "
            "LEFT JOIN user_progress up ON (mc.id = up.content_id AND up.user_id = %s) "
            "WHERE m.created_by = %s "
            "GROUP BY m.id, m.title",
            (learner_id, current_user['id']),
            fetch_all=True
        )

        # Get quiz results
        quiz_results = execute_query(
            "SELECT qr.*, q.title as quiz_title, m.title as module_title "
            "FROM quiz_results qr "
            "JOIN quizzes q ON qr.quiz_id = q.id "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE qr.user_id = %s AND m.created_by = %s "
            "ORDER BY qr.completed_at DESC",
            (learner_id, current_user['id']),
            fetch_all=True
        )

        # Get badges
        badges = execute_query(
            "SELECT b.*, ub.earned_at "
            "FROM user_badges ub "
            "JOIN badges b ON ub.badge_id = b.id "
            "WHERE ub.user_id = %s "
            "ORDER BY ub.earned_at DESC",
            (learner_id,),
            fetch_all=True
        )

        return jsonify({
            'learner': learner,
            'modules_progress': modules_progress,
            'quiz_results': quiz_results,
            'badges': badges
        })

    except Exception as e:
        app.logger.error(f"Error fetching learner details: {str(e)}")
        return jsonify({'message': 'Error fetching learner details'}), 500
    
@app.route('/assignments', methods=['POST'])
@token_required
@trainer_required
def create_assignment(current_user):
    data = request.get_json()
    required_fields = ['module_id', 'assignment_type']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Module ID and assignment type are required'}), 400

    result = execute_query(
        "SELECT * FROM modules WHERE id = %s",
        (data['module_id'],),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Module not found'}), 404

    assignment_id = execute_query(
        "INSERT INTO assignments (module_id, assigned_by, assignment_type, "
        "individual_id, department_id, employer_id, due_date, is_mandatory, notes) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            data['module_id'], current_user['id'], data['assignment_type'],
            data.get('individual_id'), data.get('department_id'),
            data.get('employer_id'), data.get('due_date'),
            data.get('is_mandatory', True), data.get('notes')
        ),
        lastrowid=True
    )

    return jsonify({
        'message': 'Assignment created successfully',
        'assignment_id': assignment_id
    }), 201

@app.route('/assignments', methods=['GET'])
@token_required
def get_assignments(current_user):
    assignments = execute_query(
        "SELECT a.*, m.title as module_title FROM assignments a "
        "JOIN modules m ON a.module_id = m.id "
        "WHERE (a.assignment_type = 'individual' AND a.individual_id = %s) "
        "OR (a.assignment_type = 'department' AND a.department_id = %s) "
        "OR (a.assignment_type = 'all' AND a.employer_id = %s) "
        "ORDER BY a.due_date",
        (current_user['id'], current_user.get('department_id'), current_user.get('employer_id')),
        fetch_all=True
    )

    for assignment in assignments:
        result = execute_query(
            "SELECT COUNT(*) as total_contents FROM module_content WHERE module_id = %s",
            (assignment['module_id'],),
            fetch_one=True
        )
        total_contents = result['total_contents']

        if total_contents > 0:
            result = execute_query(
                "SELECT COUNT(*) as completed_contents FROM user_progress WHERE user_id = %s AND status = 'completed' "
                "AND content_id IN (SELECT id FROM module_content WHERE module_id = %s)",
                (current_user['id'], assignment['module_id']),
                fetch_one=True
            )
            completed_contents = result['completed_contents']
            assignment['completion_percentage'] = int((completed_contents / total_contents) * 100)
        else:
            assignment['completion_percentage'] = 0

    return jsonify(dict_to_json_serializable(assignments))

@app.route('/assignments/<int:assignment_id>', methods=['DELETE'])
@token_required
@trainer_required
def delete_assignment(current_user, assignment_id):
    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM assignments WHERE id = %s AND assigned_by = %s",
            (assignment_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Assignment not found or unauthorized'}), 404

    execute_query(
        "DELETE FROM assignments WHERE id = %s",
        (assignment_id,)
    )

    return jsonify({'message': 'Assignment deleted successfully'})

@app.route('/badges', methods=['GET'])
@token_required
def get_all_badges(current_user):
    badges = execute_query(
        "SELECT * FROM badges",
        fetch_all=True
    )

    for badge in badges:
        result = execute_query(
            "SELECT 1 FROM user_badges WHERE user_id = %s AND badge_id = %s",
            (current_user['id'], badge['id']),
            fetch_one=True
        )
        badge['earned'] = bool(result)

    return jsonify(dict_to_json_serializable(badges))

@app.route('/badges/earned', methods=['GET'])
@token_required
def get_earned_badges(current_user):
    badges = execute_query(
        "SELECT b.*, ub.earned_at FROM badges b "
        "JOIN user_badges ub ON b.id = ub.badge_id "
        "WHERE ub.user_id = %s "
        "ORDER BY ub.earned_at DESC",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify(dict_to_json_serializable(badges))
@app.route('/badges/award', methods=['POST'])
@token_required
@trainer_required
def award_badge(current_user):
    """Award a badge to a learner"""
    try:
        data = request.get_json()
        required_fields = ['user_id', 'badge_id']
        if not all(field in data for field in required_fields):
            return jsonify({'message': 'User ID and Badge ID are required'}), 400

        # Verify badge exists
        badge = execute_query(
            "SELECT * FROM badges WHERE id = %s",
            (data['badge_id'],),
            fetch_one=True
        )
        if not badge:
            return jsonify({'message': 'Badge not found'}), 404

        # Check if user already has this badge
        existing_badge = execute_query(
            "SELECT * FROM user_badges WHERE user_id = %s AND badge_id = %s",
            (data['user_id'], data['badge_id']),
            fetch_one=True
        )
        if existing_badge:
            return jsonify({'message': 'User already has this badge'}), 400

        # Award the badge
        execute_query(
            "INSERT INTO user_badges (user_id, badge_id, earned_at) "
            "VALUES (%s, %s, %s)",
            (data['user_id'], data['badge_id'], datetime.now(timezone.utc))
        )
        
        # Update leaderboard
        update_leaderboard(data['user_id'])

        # Get user details for notification
        user_details = execute_query(
            "SELECT email, first_name FROM users WHERE id = %s",
            (data['user_id'],),
            fetch_one=True
        )

        # Send notification
        notification_template = f"""
            <h1>Congratulations! You Earned a Badge</h1>
            <p>Dear {user_details['first_name']},</p>
            <p>You have been awarded the <strong>{badge['name']}</strong> badge!</p>
            <p>{badge['description']}</p>
            <p>Keep up the great work!</p>
            <p>Best regards,<br>Hospitality Training Team</p>
        """
        send_email(user_details['email'], f"New Badge: {badge['name']}", notification_template)

        return jsonify({
            'message': 'Badge awarded successfully',
            'badge_id': data['badge_id'],
            'user_id': data['user_id']
        }), 201

    except Exception as e:
        app.logger.error(f"Error awarding badge: {str(e)}")
        return jsonify({'message': 'Error awarding badge'}), 500
@app.route('/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    """Get leaderboard data for all users"""
    try:
        # Get query parameters
        limit = int(request.args.get('limit', 10))
        period = request.args.get('period', 'all')  # 'all', 'monthly', 'weekly'

        # Base query for leaderboard
        query = """
            SELECT 
                u.id,
                u.first_name,
                u.last_name,
                u.profile_picture,
                COALESCE(l.total_points, 0) as total_points,
                COALESCE(l.badges_count, 0) as badges_count,
                COALESCE(l.modules_completed, 0) as modules_completed,
                COALESCE(l.quizzes_taken, 0) as quizzes_taken,
                COALESCE(l.quizzes_passed, 0) as quizzes_passed,
                COALESCE(l.avg_quiz_score, 0) as avg_quiz_score,
                RANK() OVER (ORDER BY COALESCE(l.total_points, 0) DESC) as rank
            FROM users u
            JOIN leaderboard l ON u.id = l.user_id
            WHERE COALESCE(l.total_points, 0) > 0
        """
        
        params = []
        
        # Apply time period filter
        if period == 'monthly':
            query += " AND l.last_updated >= %s"
            params.append(datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0))
        elif period == 'weekly':
            query += " AND l.last_updated >= %s"
            params.append(datetime.now(timezone.utc) - timedelta(days=datetime.now(timezone.utc).weekday()))
            
        query += """
            ORDER BY total_points DESC, badges_count DESC
            LIMIT %s
        """
        params.append(limit)
        
        leaderboard = execute_query(query, params, fetch_all=True) or []
        
        # Get current user's rank and stats
        user_stats = execute_query(
            """
            WITH ranked_users AS (
                SELECT 
                    u.id,
                    u.first_name,
                    u.last_name,
                    u.profile_picture,
                    COALESCE(l.total_points, 0) as total_points,
                    COALESCE(l.badges_count, 0) as badges_count,
                    COALESCE(l.modules_completed, 0) as modules_completed,
                    COALESCE(l.quizzes_taken, 0) as quizzes_taken,
                    COALESCE(l.quizzes_passed, 0) as quizzes_passed,
                    COALESCE(l.avg_quiz_score, 0) as avg_quiz_score,
                    RANK() OVER (ORDER BY COALESCE(l.total_points, 0) DESC) as rank
                FROM users u
                LEFT JOIN leaderboard l ON u.id = l.user_id
                WHERE COALESCE(l.total_points, 0) > 0
            )
            SELECT * FROM ranked_users WHERE id = %s
            """,
            (current_user['id'],),
            fetch_one=True
        )

        # Format the response data
        response_data = {
            'leaderboard': dict_to_json_serializable(leaderboard),
            'user_stats': dict_to_json_serializable(user_stats) if user_stats else None
        }

        return jsonify(response_data), 200

    except ValueError as e:
        app.logger.error(f"Invalid request parameter: {str(e)}")
        return jsonify({
            'message': 'Invalid request parameter',
            'error': str(e)
        }), 400

    except Exception as e:
        app.logger.error(f"Error fetching leaderboard: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'Error fetching leaderboard',
            'error': str(e)
        }), 500
@app.route('/leaderboard/initialize', methods=['POST'])
@token_required
@admin_required
def initialize_leaderboard(current_user):
    """Initialize or rebuild leaderboard data for all users"""
    try:
        # Get all users (not just those with employer_id)
        users = execute_query(
            "SELECT id FROM users",
            fetch_all=True
        )
        
        for user in users:
            update_leaderboard(user['id'])
            
        return jsonify({
            'message': f'Leaderboard initialized for {len(users)} users',
            'users_processed': len(users)
        }), 200

    except Exception as e:
        app.logger.error(f"Error initializing leaderboard: {str(e)}", exc_info=True)
        return jsonify({
            'message': 'Error initializing leaderboard',
            'error': str(e)
        }), 500
def create_module(current_user):
    data = request.get_json()
    required_fields = ['title', 'category']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Title and category are required'}), 400

    module_id = execute_query(
        "INSERT INTO modules (title, description, category, difficulty_level, "
        "estimated_duration, is_active, created_by) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (
            data['title'], data.get('description'), data['category'],
            data.get('difficulty_level', 'beginner'), data.get('estimated_duration'),
            data.get('is_active', True), current_user['id']
        ),
        lastrowid=True
    )

    return jsonify({
        'message': 'Module created successfully',
        'module_id': module_id
    }), 201

@app.route('/modules/<int:module_id>/content', methods=['POST'])
@token_required
@trainer_required
def add_module_content(current_user, module_id):
    data = request.get_json()
    
    # Validate YouTube URL if content is video
    if data.get('content_type') == 'video' and data.get('youtube_video_id'):
        youtube_url = data['youtube_video_id']
        
        # Verify it's a valid YouTube URL
        if not any(domain in youtube_url for domain in ['youtube.com', 'youtu.be']):
            return jsonify({'message': 'Invalid YouTube URL'}), 400
            
        video_id = extract_youtube_id(youtube_url)
        if not video_id:
            return jsonify({'message': 'Could not extract YouTube video ID'}), 400

    # Proceed with content creation
    content_id = execute_query(
        "INSERT INTO module_content (...) VALUES (...)",
        (...),
        lastrowid=True
    )

    # Handle YouTube video data
    if data.get('content_type') == 'video' and data.get('youtube_video_id'):
        execute_query(
            """INSERT INTO youtube_videos 
               (content_id, youtube_url, youtube_video_id, ...) 
               VALUES (%s, %s, %s, ...)""",
            (content_id, youtube_url, video_id, ...)
        )

    return jsonify({'message': 'Content added successfully', 'content_id': content_id}), 201
@app.route('/modules/<int:module_id>/activate', methods=['PUT'])
@token_required
@trainer_required
def activate_module(current_user, module_id):
    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
            (module_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

    execute_query(
        "UPDATE modules SET is_active = TRUE WHERE id = %s",
        (module_id,)
    )

    return jsonify({'message': 'Module activated successfully'})

@app.route('/modules/<int:module_id>/deactivate', methods=['PUT'])
@token_required
@trainer_required
def deactivate_module(current_user, module_id):
    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
            (module_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

    execute_query(
        "UPDATE modules SET is_active = FALSE WHERE id = %s",
        (module_id,)
    )

    return jsonify({'message': 'Module deactivated successfully'})

@app.route('/quizzes', methods=['POST'])
@token_required
@trainer_required
def create_quiz(current_user):
    data = request.get_json()
    required_fields = ['module_id', 'title', 'questions']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Module ID, title and questions are required'}), 400

    if not isinstance(data['questions'], list) or len(data['questions']) == 0:
        return jsonify({'message': 'At least one question is required'}), 400

    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
            (data['module_id'], current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

    quiz_id = execute_query(
        "INSERT INTO quizzes (module_id, title, description, passing_score, "
        "time_limit, is_active, created_by) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s)",
        (
            data['module_id'], data['title'], data.get('description'),
            data.get('passing_score', 80), data.get('time_limit'),
            data.get('is_active', True), current_user['id']
        ),
        lastrowid=True
    )

    for question in data['questions']:
        required_question_fields = ['question_text', 'question_type', 'options', 'correct_answer']
        if not all(field in question for field in required_question_fields):
            return jsonify({'message': 'All question fields are required'}), 400

        execute_query(
            "INSERT INTO quiz_questions (quiz_id, question_text, question_type, "
            "options, correct_answer, points) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                quiz_id, question['question_text'], question['question_type'],
                json.dumps(question['options']), question['correct_answer'],
                question.get('points', 1)
            )
        )

    return jsonify({
        'message': 'Quiz created successfully',
        'quiz_id': quiz_id
    }), 201

@app.route('/quizzes/module/<int:module_id>', methods=['GET'])
@token_required
def get_module_quizzes(current_user, module_id):
    quizzes = execute_query(
        "SELECT * FROM quizzes WHERE module_id = %s AND is_active = TRUE",
        (module_id,),
        fetch_all=True
    )

    for quiz in quizzes:
        quiz_result = execute_query(
            "SELECT score, passed, completed_at FROM quiz_results "
            "WHERE user_id = %s AND quiz_id = %s "
            "ORDER BY completed_at DESC LIMIT 1",
            (current_user['id'], quiz['id']),
            fetch_one=True
        )
        if quiz_result:
            quiz['user_result'] = quiz_result
        else:
            quiz['user_result'] = None

    return jsonify(dict_to_json_serializable(quizzes))

@app.route('/content/<int:content_id>/quiz', methods=['GET'])
@token_required
def get_content_quiz(current_user, content_id):
    """Get quiz for a specific content item through its module"""
    try:
        # Get the module this content belongs to
        content = execute_query(
            "SELECT module_id FROM module_content WHERE id = %s",
            (content_id,),
            fetch_one=True
        )
        if not content:
            return jsonify({'message': 'Content not found'}), 404

        # Get quiz for this module
        quiz = execute_query(
            "SELECT * FROM quizzes WHERE module_id = %s AND is_active = TRUE LIMIT 1",
            (content['module_id'],),
            fetch_one=True
        )

        if not quiz:
            return jsonify({'message': 'No quiz available for this content'}), 404

        # Get questions for this quiz (without correct answers)
        questions = execute_query(
            "SELECT id, question_text, options, points "
            "FROM quiz_questions WHERE quiz_id = %s",
            (quiz['id'],),
            fetch_all=True
        )

        quiz['questions'] = questions

        return jsonify(dict_to_json_serializable(quiz))

    except Exception as e:
        app.logger.error(f"Error fetching content quiz: {str(e)}")
        return jsonify({'message': 'Error fetching quiz'}), 500

@app.route('/quizzes/<int:quiz_id>', methods=['GET'])
@token_required
def get_quiz(current_user, quiz_id):
    quiz = execute_query(
        "SELECT * FROM quizzes WHERE id = %s AND is_active = TRUE",
        (quiz_id,),
        fetch_one=True
    )

    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404

    questions = execute_query(
        "SELECT id, question_text, options, points "
        "FROM quiz_questions WHERE quiz_id = %s",
        (quiz_id,),
        fetch_all=True
    )

    for question in questions:
        question.pop('correct_answer', None)

    quiz['questions'] = questions

    quiz_result = execute_query(
        "SELECT score, passed, completed_at FROM quiz_results "
        "WHERE user_id = %s AND quiz_id = %s "
        "ORDER BY completed_at DESC LIMIT 1",
        (current_user['id'], quiz_id),
        fetch_one=True
    )
    if quiz_result:
        quiz['user_result'] = quiz_result
    else:
        quiz['user_result'] = None

    return jsonify(dict_to_json_serializable(quiz))
@app.route('/quizzes/<int:quiz_id>/submit', methods=['POST'])
@token_required
def submit_quiz(current_user, quiz_id):
    """Submit quiz answers for a quiz"""
    try:
        data = request.get_json()
        if 'answers' not in data or not isinstance(data['answers'], dict):
            return jsonify({'message': 'Answers are required'}), 400

        # Get quiz details
        quiz = execute_query(
            "SELECT * FROM quizzes WHERE id = %s AND is_active = TRUE",
            (quiz_id,),
            fetch_one=True
        )
        if not quiz:
            return jsonify({'message': 'Quiz not found'}), 404

        # Get all questions for this quiz
        questions = execute_query(
            "SELECT id, question_text, correct_answer, points FROM quiz_questions "
            "WHERE quiz_id = %s",
            (quiz_id,),
            fetch_all=True
        )

        # Calculate score
        total_score = 0
        max_score = sum(q['points'] for q in questions)
        correct_answers = {}
        user_answers = data['answers']

        for question in questions:
            correct_answers[str(question['id'])] = question['correct_answer']
            if str(question['id']) in user_answers and user_answers[str(question['id'])] == question['correct_answer']:
                total_score += question['points']

        percentage = (total_score / max_score) * 100 if max_score > 0 else 0
        passed = percentage >= quiz['passing_score']

        # Save quiz result
        execute_query(
            "INSERT INTO quiz_results (user_id, quiz_id, score, max_score, "
            "percentage, passed, answers, correct_answers, completed_at) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                current_user['id'], quiz['id'], total_score, max_score,
                percentage, passed, json.dumps(user_answers), json.dumps(correct_answers),
                datetime.now(timezone.utc)
            )
        )

        response = {
            'message': 'Quiz submitted successfully',
            'quiz_id': quiz['id'],
            'score': total_score,
            'max_score': max_score,
            'percentage': percentage,
            'passed': passed,
            'badges_awarded': [],
            'points_awarded': 0
        }

        if passed:
            # Award points for passing the quiz
            points_result = award_points(
                current_user['id'],
                app.config['POINTS_FOR_QUIZ'],
                f"Passed quiz {quiz_id} with score {percentage}%"
            )
            response['points_awarded'] = app.config['POINTS_FOR_QUIZ']
            
            if points_result.get('badges_awarded'):
                response['badges_awarded'] = points_result['badges_awarded']

            # Check for quiz-specific badges
            quiz_badges = check_quiz_badges(current_user['id'], quiz['id'], percentage)
            if quiz_badges:
                response['badges_awarded'].extend(quiz_badges)
            
            # Update leaderboard if user has an employer
            if current_user.get('employer_id'):
                update_leaderboard(current_user['id'], current_user['employer_id'])
                response['leaderboard_update'] = True

        return jsonify(response), 200

    except Exception as e:
        app.logger.error(f"Error submitting quiz: {str(e)}")
        return jsonify({'message': 'Error submitting quiz'}), 500
@app.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    unread_notifications = execute_query(
        "SELECT * FROM notifications WHERE user_id = %s AND is_read = FALSE "
        "ORDER BY created_at DESC",
        (current_user['id'],),
        fetch_all=True
    )

    read_notifications = execute_query(
        "SELECT * FROM notifications WHERE user_id = %s AND is_read = TRUE "
        "ORDER BY created_at DESC LIMIT 10",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify({
        'unread': dict_to_json_serializable(unread_notifications),
        'read': dict_to_json_serializable(read_notifications)
    })

@app.route('/notifications/mark-read', methods=['POST'])
@token_required
def mark_notifications_read(current_user):
    execute_query(
        "UPDATE notifications SET is_read = TRUE WHERE user_id = %s",
        (current_user['id'],)
    )
    return jsonify({'message': 'Notifications marked as read'})

@app.route('/dashboard/stats', methods=['GET'])
@token_required
@trainer_required
def get_dashboard_stats(current_user):
    stats = {}

    if current_user['role'] == 'admin':
        result = execute_query("SELECT COUNT(*) as total_users FROM users", fetch_one=True)
    else:
        result = execute_query(
            "SELECT COUNT(*) as total_users FROM users WHERE employer_id = %s",
            (current_user.get('employer_id'),),
            fetch_one=True
        )
    stats['total_users'] = result['total_users']

    if current_user['role'] == 'admin':
        result = execute_query(
            "SELECT COUNT(*) as active_users FROM users WHERE is_active = TRUE",
            fetch_one=True
        )
    else:
        result = execute_query(
            "SELECT COUNT(*) as active_users FROM users WHERE is_active = TRUE AND employer_id = %s",
            (current_user.get('employer_id'),),
            fetch_one=True
        )
    stats['active_users'] = result['active_users']

    if current_user['role'] == 'admin':
        result = execute_query("SELECT COUNT(*) as total_modules FROM modules", fetch_one=True)
    else:
        result = execute_query(
            "SELECT COUNT(*) as total_modules FROM modules WHERE created_by = %s",
            (current_user['id'],),
            fetch_one=True
        )
    stats['total_modules'] = result['total_modules']

    if current_user['role'] == 'admin':
        result = execute_query(
            "SELECT COUNT(*) as active_modules FROM modules WHERE is_active = TRUE",
            fetch_one=True
        )
    else:
        result = execute_query(
            "SELECT COUNT(*) as active_modules FROM modules WHERE is_active = TRUE AND created_by = %s",
            (current_user['id'],),
            fetch_one=True
        )
    stats['active_modules'] = result['active_modules']

    if current_user['role'] == 'admin':
        recent_activity = execute_query(
            "SELECT u.first_name, u.last_name, m.title as module_title, "
            "up.status, up.last_accessed "
            "FROM user_progress up "
            "JOIN users u ON up.user_id = u.id "
            "JOIN module_content mc ON up.content_id = mc.id "
            "JOIN modules m ON mc.module_id = m.id "
            "ORDER BY up.last_accessed DESC LIMIT 10",
            fetch_all=True
        )
    else:
        recent_activity = execute_query(
            "SELECT u.first_name, u.last_name, m.title as module_title, "
            "up.status, up.last_accessed "
            "FROM user_progress up "
            "JOIN users u ON up.user_id = u.id "
            "JOIN module_content mc ON up.content_id = mc.id "
            "JOIN modules m ON mc.module_id = m.id "
            "WHERE u.employer_id = %s "
            "ORDER BY up.last_accessed DESC LIMIT 10",
            (current_user.get('employer_id'),),
            fetch_all=True
        )
    stats['recent_activity'] = dict_to_json_serializable(recent_activity)

    return jsonify(stats)
@app.route('/offline-content', methods=['GET'])
@token_required
def get_offline_content(current_user):
    user_offline_dir = os.path.join(app.config['OFFLINE_CONTENT_DIR'], str(current_user['id']))
    if not os.path.exists(user_offline_dir):
        return jsonify({'offline_content': [], 'total_size': 0})

    offline_content = []
    total_size = 0

    for content_id in os.listdir(user_offline_dir):
        content_path = os.path.join(user_offline_dir, content_id)
        if os.path.isfile(content_path):
            total_size += os.path.getsize(content_path)

            content_info = execute_query(
                "SELECT id, title, content_type FROM module_content WHERE id = %s",
                (int(content_id),),
                fetch_one=True
            )

            if content_info:
                offline_content.append({
                    'id': content_info['id'],
                    'title': content_info['title'],
                    'content_type': content_info['content_type'],
                    'size': os.path.getsize(content_path)
                })

    return jsonify({
        'offline_content': offline_content,
        'total_size': total_size,
        'max_size': app.config['MAX_OFFLINE_CONTENT_SIZE']
    })
@app.route('/content/<int:content_id>/download', methods=['GET'])
@token_required
def download_content(current_user, content_id):
    """Return content URL (or YouTube embed URL if video)"""
    content = execute_query(
        "SELECT * FROM module_content WHERE id = %s",
        (content_id,),
        fetch_one=True
    )
    if not content:
        return jsonify({'message': 'Content not found'}), 404

    # Handle YouTube videos
    if content.get('content_type') == 'video' and content.get('youtube_video_id'):
        embed_url = f"https://www.youtube.com/embed/{content['youtube_video_id']}"
        return jsonify({
            'url': embed_url,
            'type': 'youtube_embed'  # Helps frontend know it's a YouTube video
        })

    # Handle files (PDFs, etc.)
    if content.get('file_path'):
        if os.path.exists(content['file_path']):
            return send_file(content['file_path'], as_attachment=True)
        else:
            return jsonify({'message': 'File not found'}), 404

    # Fallback: Return URL if available
    if content.get('url'):
        return jsonify({'url': content['url']}), 200

    return jsonify({'message': 'No downloadable content found'}), 400
@app.route('/offline-content/check/<int:content_id>', methods=['GET'])
@token_required
def check_offline_content(current_user, content_id):
    """Check if content is available offline"""
    offline_path = os.path.join(
        app.config['OFFLINE_CONTENT_DIR'],
        str(current_user['id']),
        str(content_id)
    )
    
    content = execute_query(
        "SELECT * FROM module_content WHERE id = %s",
        (content_id,),
        fetch_one=True
    )
    
    return jsonify({
        'isAvailable': os.path.exists(offline_path),
        'contentId': content_id,
        'estimatedSize': content.get('size', 0) if content else 0
    })
@app.route('/offline-content/<int:content_id>', methods=['DELETE'])
@token_required
def delete_offline_content(current_user, content_id):
    content_path = os.path.join(
        app.config['OFFLINE_CONTENT_DIR'],
        str(current_user['id']),
        str(content_id)
    )

    if os.path.exists(content_path):
        try:
            os.remove(content_path)
            return jsonify({'message': 'Content removed from offline storage'})
        except Exception as e:
            app.logger.error(f"Failed to delete offline content {content_id}: {str(e)}")
            return jsonify({'message': 'Failed to remove content from offline storage'}), 500
    else:
        return jsonify({'message': 'Content not found in offline storage'}), 404
@app.route('/modules/recent', methods=['GET'])
@token_required
def get_recent_modules(current_user):
    # Adjust the query as needed (e.g., order by created_at or updated_at)
    modules = execute_query(
        "SELECT * FROM modules WHERE is_active = TRUE ORDER BY created_at DESC LIMIT 5",
        fetch_all=True
    )
    return jsonify(dict_to_json_serializable(modules))
# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Server error: {str(error)}', exc_info=True)
    return jsonify({'message': 'Internal server error'}), 500

@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({'message': 'Method not allowed'}), 405

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:5173')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__=='__main__':
    app.run(debug=True)
