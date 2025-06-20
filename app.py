import os
import mysql.connector
from mysql.connector import pooling
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

# Ensure the required directories exist

# Initialize Flask app
app = Flask(__name__)

# Configure CORS with proper security settings
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://localhost:5000",
            "https://jifunzemara.pythonanywhere.com"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "x-access-token"],
        "supports_credentials": True
    }
})

# Database Configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'hospitality_training_apps',
    'pool_name': 'mypool',
    'pool_size': 5,
    'pool_reset_session': True
}

# Create connection pool
db_pool = pooling.MySQLConnectionPool(**db_config)

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
if not os.path.exists('logs'):
    os.mkdir('logs')
file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=10)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
app.logger.addHandler(file_handler)
app.logger.setLevel(logging.INFO)
app.logger.info('Hospitality Training App startup')

# Create offline content directory if it doesn't exist
if not os.path.exists(app.config['OFFLINE_CONTENT_DIR']):
    os.makedirs(app.config['OFFLINE_CONTENT_DIR'])

# Database Helper Functions
def get_db_connection():
    return db_pool.get_connection()

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
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        # Check for token in Authorization header first
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split(" ")[1]
        # Fall back to x-access-token
        elif 'x-access-token' in request.headers:
            token = request.headers['x-access-token']

        if not token:
            return jsonify({'message': 'Token is missing!'}), 401

        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = get_user_by_id(data['user_id'])
            if not current_user:
                raise ValueError("User not found")
            request.current_user = current_user
        except Exception as e:
            app.logger.error(f'Token validation failed: {str(e)}')
            return jsonify({'message': 'Token is invalid!'}), 401

        return f(*args, **kwargs)
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
            app.logger.error(f'User {current_user["id"]} attempted to access trainer endpoint without proper role')
            return jsonify({'message': 'Trainer access required!'}), 403
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
    # Add points
    execute_query(
        "INSERT INTO user_points (user_id, points, reason, awarded_at) "
        "VALUES (%s, %s, %s, %s)",
        (user_id, points, reason, datetime.utcnow())
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
                    (user_id, badge_level, datetime.utcnow())
                )
                badges_awarded.append(badge_level)

    # Return information about points and any new badges
    return {
        'total_points': total_points,
        'badges_awarded': badges_awarded
    }

# Certificate Generation Functions
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
    except:
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

def update_leaderboard(user_id, employer_id):
    """Update the leaderboard with user's current stats"""
    # Get user's current stats
    result = execute_query(
        "SELECT COALESCE(SUM(points), 0) as total_points FROM user_points WHERE user_id = %s",
        (user_id,),
        fetch_one=True
    )
    total_points = result['total_points']

    result = execute_query(
        "SELECT COUNT(*) as badges_count FROM user_badges WHERE user_id = %s",
        (user_id,),
        fetch_one=True
    )
    badges_count = result['badges_count']

    result = execute_query(
        "SELECT COUNT(DISTINCT m.id) as modules_completed FROM modules m "
        "JOIN module_content mc ON m.id = mc.module_id "
        "JOIN user_progress up ON mc.id = up.content_id "
        "WHERE up.user_id = %s AND up.status = 'completed' "
        "GROUP BY m.id "
        "HAVING COUNT(mc.id) = SUM(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END)",
        (user_id,),
        fetch_all=True
    )
    modules_completed = len(result)

    # Update or insert leaderboard entry
    execute_query(
        "INSERT INTO leaderboard (user_id, employer_id, total_points, badges_count, modules_completed, last_updated) "
        "VALUES (%s, %s, %s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE "
        "total_points = VALUES(total_points), "
        "badges_count = VALUES(badges_count), "
        "modules_completed = VALUES(modules_completed), "
        "last_updated = VALUES(last_updated)",
        (user_id, employer_id, total_points, badges_count, modules_completed, datetime.utcnow())
    )

def update_user(user_id, data):
    execute_query(
        "UPDATE users SET email = %s, first_name = %s, last_name = %s, phone = %s, "
        "profile_picture = %s, role = %s, employer_id = %s, is_active = %s, "
        "last_login = %s, reset_token = %s, reset_token_expires = %s "
        "WHERE user_id = %s",
        (
            data.get('email'), data.get('first_name'), data.get('last_name'),
            data.get('phone'), data.get('profile_picture'), data.get('role'),
            data.get('employer_id'), data.get('is_active', True),
            data.get('last_login'), data.get('reset_token'),
            data.get('reset_token_expires'), user_id
        )
    )

# certificate endpoints
@app.route('/user/certificates/preview/<string:cert_type>/<int:item_id>', methods=['GET'])
@token_required
def preview_certificate(current_user, cert_type, item_id):
    """Preview a certificate as PDF"""
    certificate_data = None

    if cert_type == 'module':
        # Verify module is completed
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

        # Generate certificate data
        certificate_data = {
            'type': 'module',
            'certificate_id': f"MOD-{module_data['id']}-{current_user['id']}",
            'title': module_data['title'],
            'user_name': f"{current_user['first_name']} {current_user['last_name']}",
            'completed_at': module_data['completed_at'].strftime('%B %d, %Y'),
            'description': f"has successfully completed the {module_data['title']} training module.",
        }

    elif cert_type == 'quiz':
        # Verify quiz was passed
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

        # Generate certificate data
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

    # Generate PDF
    pdf_buffer = generate_certificate_pdf(certificate_data, preview=True)

    # Return as preview (inline)
    return send_file(
        pdf_buffer,
        as_attachment=False,
        download_name=f"certificate_preview_{cert_type}_{item_id}.pdf",
        mimetype='application/pdf'
    )

@app.route('/user/certificates/download/<string:cert_type>/<int:item_id>', methods=['GET'])
@token_required
def download_certificate(current_user, cert_type, item_id):
    """Download a certificate as PDF"""
    certificate_data = None

    if cert_type == 'module':
        # Verify module is completed
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

        # Generate certificate data
        certificate_data = {
            'type': 'module',
            'certificate_id': f"MOD-{module_data['id']}-{current_user['id']}",
            'title': module_data['title'],
            'user_name': f"{current_user['first_name']} {current_user['last_name']}",
            'completed_at': module_data['completed_at'].strftime('%B %d, %Y'),
            'description': f"has successfully completed the {module_data['title']} training module.",
        }

    elif cert_type == 'quiz':
        # Verify quiz was passed
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

        # Generate certificate data
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

    # Generate PDF
    pdf_buffer = generate_certificate_pdf(certificate_data)

    # Store certificate record in database
    execute_query(
        "INSERT INTO user_certificates (user_id, certificate_type, item_id, "
        "certificate_id, generated_at) "
        "VALUES (%s, %s, %s, %s, %s) "
        "ON DUPLICATE KEY UPDATE generated_at = %s",
        (
            current_user['id'], cert_type, item_id,
            certificate_data['certificate_id'], datetime.utcnow(),
            datetime.utcnow()
        )
    )

    # Return as downloadable file
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f"certificate_{cert_type}_{item_id}.pdf",
        mimetype='application/pdf'
    )

@app.route('/user/certificates/history', methods=['GET'])
@token_required
def get_certificate_history(current_user):
    """Get history of all generated certificates"""
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
def get_user_by_id(user_id):
    user = execute_query(
        "SELECT * FROM users WHERE user_id = %s",  # Changed from id to user_id
        (user_id,),
        fetch_one=True
    )
    return dict_to_json_serializable(user) if user else None
@app.route('/register', methods=['POST', 'OPTIONS'])  # Add OPTIONS here
def register():
    if request.method == 'OPTIONS':
        # Handle preflight request
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "http://localhost:5173")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response
    try:
        # 1. Validate request
        if not request.is_json:
            return jsonify({'message': 'Request must be JSON'}), 400

        data = request.get_json()

        # 2. Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name', 'role']
        if not all(field in data for field in required_fields):
            missing = [field for field in required_fields if field not in data]
            return jsonify({'message': f'Missing required fields: {missing}'}), 400

        # 3. Check if email exists
        existing_user = execute_query(
            "SELECT user_id FROM users WHERE email = %s",  # Changed from id to user_id
            (data['email'],),
            fetch_one=True
        )
        if existing_user:
            return jsonify({'message': 'Email already registered'}), 409

        # 4. Hash password
        hashed_password = generate_password_hash(data['password'])

        # 5. Database operation - make sure column names match your database
        user_id = execute_query(
            "INSERT INTO users "
            "(email, password_hash, first_name, last_name, role, employer_id, phone) "
            "VALUES "
            "(%s, %s, %s, %s, %s, %s, %s)",
            (
                data['email'], hashed_password, data['first_name'], data['last_name'],
                data['role'], data.get('employer_id'), data.get('phone')
            ),
            lastrowid=True
        )

        # 6. Get the created user - using the correct primary key column name
        user = execute_query(
            "SELECT user_id as id, email, first_name, last_name, role FROM users WHERE user_id = %s",  # Using alias
            (user_id,),
            fetch_one=True
        )

        if not user:
            raise ValueError("User not found after creation")

        # 7. Generate JWT token - using the correct ID field
        token = jwt.encode(
            {
                'user_id': user['id'],  # This now works because we aliased user_id as id
                'exp': datetime.now(timezone.utc) + timedelta(hours=1)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )

        # 8. Prepare response
        response_data = {
            'message': 'User registered successfully',
            'user': {
                'id': user['id'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'role': user['role']
            },
            'token': token
        }

        return jsonify(response_data), 201

    except Exception as e:
        app.logger.error(f"Registration process error: {str(e)}", exc_info=True)
        return jsonify({'message': 'Registration process failed'}), 500
def get_user_by_email(email):
    user = execute_query(
        "SELECT * FROM users WHERE email = %s",
        (email,),
        fetch_one=True
    )
    if user:
        # Ensure the ID is always returned as 'id' regardless of the column name in DB
        user['id'] = user.get('id') or user.get('user_id')
        return dict_to_json_serializable(user)
    return None

@app.route('/login', methods=['POST'])
def login():
    auth = request.get_json()

    if not auth or not auth.get('email') or not auth.get('password'):
        return jsonify({'message': 'Email and password required'}), 401

    user = get_user_by_email(auth['email'])

    if not user or not check_password_hash(user['password_hash'], auth['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    if not user['is_active']:
        return jsonify({'message': 'Account is inactive'}), 403

    # Update last login
    update_user(user['id'], {'last_login': datetime.utcnow()})

    token = jwt.encode(
        {'user_id': user['id'], 'exp': datetime.now(timezone.utc)+ timedelta(seconds=3600)},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )

    # Create refresh token
    refresh_token = jwt.encode(
        {'user_id': user['id'], 'exp': datetime.now(timezone.utc)+ app.config['JWT_REFRESH_TOKEN_EXPIRES']},
        app.config['SECRET_KEY'],
        algorithm='HS256'
    )

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'refresh_token': refresh_token,
        'user': dict_to_json_serializable(user)
    })
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

        # Create new access token
        new_token = jwt.encode(
            {
                'user_id': user['id'],  # Use user['user_id'] if that's the column name in DB
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
        # Don't reveal whether the email exists for security
        return jsonify({'message': 'If this email is registered, you will receive a password reset link'}), 200

    # Generate reset token (expires in 1 hour)
    reset_token = serializer.dumps(email, salt=app.config['SECURITY_PASSWORD_SALT'])
    update_user(user['id'], {
        'reset_token': reset_token,
        'reset_token_expires': datetime.now(timezone.utc)+ timedelta(hours=1)
    })

    # Send reset email
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
            max_age=3600  # 1 hour expiration
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

    # Update password and clear reset token
    hashed_password = generate_password_hash(new_password)
    execute_query(
        "UPDATE users SET password_hash = %s, reset_token = NULL, reset_token_expires = NULL WHERE id = %s",
        (hashed_password, user['id'])
    )

    # Send confirmation email
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
def update_profile(current_user):
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
    data = request.get_json()

    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'message': 'Current and new password required'}), 400

    if not check_password_hash(current_user['password_hash'], data['current_password']):
        return jsonify({'message': 'Current password is incorrect'}), 401

    # Update password
    hashed_password = generate_password_hash(data['new_password'])
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

# User Management Routes
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

    # Get user email for notification
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

    # Get user email for notification
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

# Contact Us Route
@app.route('/contact', methods=['POST'])
def contact():
    data = request.get_json()

    required_fields = ['name', 'email', 'message']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Name, email and message are required'}), 400

    # Send email to admin
    contact_template = f"""
        <h1>New Contact Form Submission</h1>
        <p><strong>From:</strong> {data['name']} ({data['email']})</p>
        <p><strong>Message:</strong></p>
        <p>{data['message']}</p>
    """

    if send_email(app.config['MAIL_DEFAULT_SENDER'], "New Contact Form Submission", contact_template):
        # Send confirmation to user
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

# Training Content Routes
@app.route('/modules', methods=['GET'])
@token_required
def get_modules(current_user):
    modules = execute_query(
        "SELECT * FROM modules WHERE is_active = TRUE",
        fetch_all=True
    )

    # Add completion percentage for each module
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
    module = execute_query(
        "SELECT * FROM modules WHERE id = %s AND is_active = TRUE",
        (module_id,),
        fetch_one=True
    )

    if not module:
        return jsonify({'message': 'Module not found'}), 404

    # Get module contents
    contents = execute_query(
        "SELECT * FROM module_content WHERE module_id = %s ORDER BY display_order",
        (module_id,),
        fetch_all=True
    )

    # Get user progress for each content
    for content in contents:
        progress = execute_query(
            "SELECT * FROM user_progress WHERE user_id = %s AND content_id = %s",
            (current_user['id'], content['id']),
            fetch_one=True
        )
        content['user_progress'] = progress if progress else {
            'status': 'not_started',
            'progress': 0
        }

        # Add YouTube video info if content is a video
        if content['content_type'] == 'video':
            youtube_video = execute_query(
                "SELECT * FROM youtube_videos WHERE content_id = %s",
                (content['id'],),
                fetch_one=True
            )
            if youtube_video:
                content['youtube_video'] = youtube_video

        # Add offline access info
        content['offline_available'] = check_offline_access(current_user['id'], content['id'])

    module['contents'] = contents
    return jsonify(dict_to_json_serializable(module))

@app.route('/content/<int:content_id>/download', methods=['POST'])
@token_required
def download_content(current_user, content_id):
    # Check if content exists
    content = execute_query(
        "SELECT * FROM module_content WHERE id = %s",
        (content_id,),
        fetch_one=True
    )
    if not content:
        return jsonify({'message': 'Content not found'}), 404

    # Check if content is downloadable
    if not content['is_downloadable']:
        return jsonify({'message': 'Content is not available for offline download'}), 403

    # Check if user has enough offline storage space
    current_size = calculate_offline_size(current_user['id'])
    if current_size >= app.config['MAX_OFFLINE_CONTENT_SIZE']:
        return jsonify({'message': 'You have reached your offline storage limit'}), 403

    # Create user's offline directory if it doesn't exist
    user_offline_dir = os.path.join(app.config['OFFLINE_CONTENT_DIR'], str(current_user['id']))
    if not os.path.exists(user_offline_dir):
        os.makedirs(user_offline_dir)

    # Download content based on type
    content_path = os.path.join(user_offline_dir, str(content_id))

    try:
        if content['content_type'] == 'video' and content.get('url'):
            # For YouTube videos, we'll store metadata for offline playback
            youtube_video = execute_query(
                "SELECT * FROM youtube_videos WHERE content_id = %s",
                (content_id,),
                fetch_one=True
            )

            if youtube_video:
                # Create a simple HTML file for offline playback
                offline_content = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <title>{content['title']}</title>
                </head>
                <body>
                    <h1>{content['title']}</h1>
                    <p>{content.get('description', '')}</p>
                    <div>
                        <p>Note: This video requires internet connection to play.</p>
                        <p>Original YouTube URL: {youtube_video['youtube_video_id']}</p>
                    </div>
                </body>
                </html>
                """

                with open(content_path, 'w') as f:
                    f.write(offline_content)
        elif content['content_type'] == 'document' and content.get('url'):
            # Download document from URL
            response = requests.get(content['url'], stream=True)
            if response.status_code == 200:
                with open(content_path, 'wb') as f:
                    for chunk in response.iter_content(1024):
                        f.write(chunk)
            else:
                raise Exception("Failed to download document")
        elif content['content_type'] == 'html' and content.get('url'):
            # Download HTML content and store it
            response = requests.get(content['url'])
            if response.status_code == 200:
                # Parse and clean HTML if needed
                soup = BeautifulSoup(response.text, 'html.parser')
                with open(content_path, 'w') as f:
                    f.write(str(soup))
            else:
                raise Exception("Failed to download HTML content")
        else:
            return jsonify({'message': 'Content type not supported for offline download'}), 400

        return jsonify({'message': 'Content downloaded for offline access'})
    except Exception as e:
        app.logger.error(f"Failed to download content {content_id}: {str(e)}")
        if os.path.exists(content_path):
            os.remove(content_path)
        return jsonify({'message': 'Failed to download content for offline access'}), 500

# Trainer report routes
@app.route('/trainer/reports/module-progress', methods=['GET'])
@token_required
@trainer_required
def get_module_progress_report(current_user):
    module_id = request.args.get('module_id')
    time_range = request.args.get('time_range', '30d')  # 7d, 30d, 90d, all

    # Build time filter
    time_filters = {
        '7d': "AND up.last_accessed >= NOW() - INTERVAL 7 DAY",
        '30d': "AND up.last_accessed >= NOW() - INTERVAL 30 DAY",
        '90d': "AND up.last_accessed >= NOW() - INTERVAL 90 DAY",
        'all': ""
    }
    time_filter = time_filters.get(time_range, time_filters['30d'])

    if module_id:
        # Verify the module belongs to the trainer
        result = execute_query(
            "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
            (module_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

        # Get detailed progress for a specific module
        progress_data = execute_query(
            f"SELECT u.id, u.first_name, u.last_name, u.email, "
            "COUNT(DISTINCT mc.id) as total_content, "
            "COUNT(DISTINCT up.content_id) as completed_content, "
            "MAX(up.last_accessed) as last_accessed "
            "FROM users u "
            "JOIN user_progress up ON u.id = up.user_id "
            "JOIN module_content mc ON up.content_id = mc.id "
            "WHERE mc.module_id = %s {time_filter} "
            "GROUP BY u.id, u.first_name, u.last_name, u.email "
            "ORDER BY last_accessed DESC".format(time_filter=time_filter),
            (module_id,),
            fetch_all=True
        )

        # Get completion rate over time
        completion_over_time = execute_query(
            f"SELECT DATE(up.last_accessed) as date, "
            "COUNT(DISTINCT up.user_id) as users, "
            "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completions "
            "FROM user_progress up "
            "JOIN module_content mc ON up.content_id = mc.id "
            "WHERE mc.module_id = %s {time_filter} "
            "GROUP BY DATE(up.last_accessed) "
            "ORDER BY DATE(up.last_accessed)".format(time_filter=time_filter),
            (module_id,),
            fetch_all=True
        )

        return jsonify({
            'progress_data': dict_to_json_serializable(progress_data),
            'completion_over_time': dict_to_json_serializable(completion_over_time)
        })
    else:
        # Get summary for all modules
        module_summary = execute_query(
            f"SELECT m.id, m.title, "
            "COUNT(DISTINCT up.user_id) as learners, "
            "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completers "
            "FROM modules m "
            "JOIN module_content mc ON m.id = mc.module_id "
            "LEFT JOIN user_progress up ON mc.id = up.content_id {time_filter} "
            "WHERE m.created_by = %s "
            "GROUP BY m.id, m.title "
            "ORDER BY learners DESC".format(time_filter=time_filter),
            (current_user['id'],),
            fetch_all=True
        )

        return jsonify(dict_to_json_serializable(module_summary))

@app.route('/trainer/reports/quiz-performance', methods=['GET'])
@token_required
@trainer_required
def get_quiz_performance_report(current_user):
    quiz_id = request.args.get('quiz_id')
    time_range = request.args.get('time_range', '30d')  # 7d, 30d, 90d, all

    # Build time filter
    time_filters = {
        '7d': "AND qr.completed_at >= NOW() - INTERVAL 7 DAY",
        '30d': "AND qr.completed_at >= NOW() - INTERVAL 30 DAY",
        '90d': "AND qr.completed_at >= NOW() - INTERVAL 90 DAY",
        'all': ""
    }
    time_filter = time_filters.get(time_range, time_filters['30d'])

    if quiz_id:
        # Verify the quiz belongs to the trainer
        result = execute_query(
            "SELECT 1 FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "WHERE q.id = %s AND m.created_by = %s",
            (quiz_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Quiz not found or unauthorized'}), 404

        # Get detailed quiz results
        quiz_results = execute_query(
            f"SELECT qr.*, u.first_name, u.last_name, u.email "
            "FROM quiz_results qr "
            "JOIN users u ON qr.user_id = u.id "
            "WHERE qr.quiz_id = %s {time_filter} "
            "ORDER BY qr.completed_at DESC".format(time_filter=time_filter),
            (quiz_id,),
            fetch_all=True
        )

        # Get question statistics
        question_stats = execute_query(
            f"SELECT qq.id, qq.question_text, "
            "COUNT(DISTINCT qr.user_id) as attempts, "
            "AVG(CASE WHEN qr.answers->>CONCAT('$.', qq.id) = qq.correct_answer THEN 1 ELSE 0 END) as correctness_rate "
            "FROM quiz_questions qq "
            "JOIN quiz_results qr ON qq.quiz_id = qr.quiz_id "
            "WHERE qq.quiz_id = %s {time_filter} "
            "GROUP BY qq.id, qq.question_text".format(time_filter=time_filter),
            (quiz_id,),
            fetch_all=True
        )

        return jsonify({
            'quiz_results': dict_to_json_serializable(quiz_results),
            'question_stats': dict_to_json_serializable(question_stats)
        })
    else:
        # Get summary for all quizzes
        quiz_summary = execute_query(
            f"SELECT q.id, q.title, m.title as module_title, "
            "COUNT(DISTINCT qr.user_id) as attempts, "
            "AVG(qr.percentage) as avg_score, "
            "AVG(CASE WHEN qr.passed THEN 1 ELSE 0 END) as pass_rate "
            "FROM quizzes q "
            "JOIN modules m ON q.module_id = m.id "
            "LEFT JOIN quiz_results qr ON q.id = qr.quiz_id {time_filter} "
            "WHERE m.created_by = %s "
            "GROUP BY q.id, q.title, m.title "
            "ORDER BY attempts DESC".format(time_filter=time_filter),
            (current_user['id'],),
            fetch_all=True
        )

        return jsonify(dict_to_json_serializable(quiz_summary))

# Trainer assignments Routes
@app.route('/trainer/assignments', methods=['GET'])
@token_required
@trainer_required
def get_trainer_assignments(current_user):
    # Get all assignments for modules created by the trainer
    assignments = execute_query(
        "SELECT a.*, m.title as module_title, "
        "COUNT(DISTINCT a.individual_id) as assigned_count, "
        "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completed_count "
        "FROM assignments a "
        "JOIN modules m ON a.module_id = m.id "
        "LEFT JOIN module_content mc ON m.id = mc.module_id "
        "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = a.individual_id "
        "WHERE m.created_by = %s "
        "GROUP BY a.id, m.title "
        "ORDER BY a.due_date DESC",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify(dict_to_json_serializable(assignments))

@app.route('/trainer/assignments/<int:assignment_id>', methods=['GET'])
@token_required
@trainer_required
def get_assignment_details(current_user, assignment_id):
    # Verify the assignment is for a module created by the trainer
    result = execute_query(
        "SELECT 1 FROM assignments a "
        "JOIN modules m ON a.module_id = m.id "
        "WHERE a.id = %s AND m.created_by = %s",
        (assignment_id, current_user['id']),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Assignment not found or unauthorized'}), 404

    # Get assignment details
    assignment = execute_query(
        "SELECT a.*, m.title as module_title FROM assignments a "
        "JOIN modules m ON a.module_id = m.id "
        "WHERE a.id = %s",
        (assignment_id,),
        fetch_one=True
    )

    # Get assigned users
    if assignment['assignment_type'] == 'individual':
        assigned_users = execute_query(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.profile_picture, "
            "COUNT(DISTINCT mc.id) as total_content, "
            "COUNT(DISTINCT up.content_id) as completed_content "
            "FROM users u "
            "JOIN module_content mc ON u.id = %s "  # This line seems incorrect, needs review
            "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = u.id AND up.status = 'completed' "
            "WHERE u.id = %s "
            "GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_picture",
            (assignment['individual_id'], assignment['individual_id']),
            fetch_all=True
        )
    elif assignment['assignment_type'] == 'department':
        assigned_users = execute_query(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.profile_picture, "
            "COUNT(DISTINCT mc.id) as total_content, "
            "COUNT(DISTINCT up.content_id) as completed_content "
            "FROM users u "
            "JOIN module_content mc ON %s = %s "  # This line seems incorrect, needs review
            "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = u.id AND up.status = 'completed' "
            "WHERE u.department_id = %s "
            "GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_picture",
            (assignment['department_id'], assignment['department_id'], assignment['department_id']),
            fetch_all=True
        )
    else:  # 'all' assignment type
        assigned_users = execute_query(
            "SELECT u.id, u.first_name, u.last_name, u.email, u.profile_picture, "
            "COUNT(DISTINCT mc.id) as total_content, "
            "COUNT(DISTINCT up.content_id) as completed_content "
            "FROM users u "
            "JOIN module_content mc ON %s = %s "  # This line seems incorrect, needs review
            "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = u.id AND up.status = 'completed' "
            "WHERE u.employer_id = %s "
            "GROUP BY u.id, u.first_name, u.last_name, u.email, u.profile_picture",
            (assignment['employer_id'], assignment['employer_id'], assignment['employer_id']),
            fetch_all=True
        )

    return jsonify({
        'assignment': dict_to_json_serializable(assignment),
        'assigned_users': dict_to_json_serializable(assigned_users)
    })

# Trainer learners Routes
@app.route('/trainer/learners', methods=['GET'])
@token_required
@trainer_required
def get_trainer_learners(current_user):
    # Get all learners assigned to the trainer's modules
    learners = execute_query(
        "SELECT DISTINCT u.id, u.first_name, u.last_name, u.email, u.profile_picture, "
        "u.last_login, e.name as employer_name "
        "FROM users u "
        "LEFT JOIN employers e ON u.employer_id = e.id "
        "JOIN user_progress up ON u.id = up.user_id "
        "JOIN module_content mc ON up.content_id = mc.id "
        "JOIN modules m ON mc.module_id = m.id "
        "WHERE m.created_by = %s AND u.role = 'user' "
        "ORDER BY u.last_name, u.first_name",
        (current_user['id'],),
        fetch_all=True
    )

    # Add progress stats for each learner
    for learner in learners:
        # Get modules assigned/completed
        stats = execute_query(
            "SELECT COUNT(DISTINCT m.id) as assigned_modules, "
            "COUNT(DISTINCT CASE WHEN mod_completed.module_id IS NOT NULL THEN m.id END) as completed_modules "
            "FROM modules m "
            "JOIN module_content mc ON m.id = mc.module_id "
            "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = %s "
            "LEFT JOIN ("
            "   SELECT mc.module_id "
            "   FROM module_content mc "
            "   JOIN user_progress up ON mc.id = up.content_id AND up.user_id = %s AND up.status = 'completed' "
            "   GROUP BY mc.module_id "
            "   HAVING COUNT(DISTINCT mc.id) = COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.content_id END)"
            ") mod_completed ON m.id = mod_completed.module_id "
            "WHERE m.created_by = %s",
            (learner['id'], learner['id'], current_user['id']),
            fetch_one=True
        )
        learner['assigned_modules'] = stats['assigned_modules']
        learner['completed_modules'] = stats['completed_modules']

        # Get points and badges
        result = execute_query(
            "SELECT COALESCE(SUM(points), 0) as total_points FROM user_points WHERE user_id = %s",
            (learner['id'],),
            fetch_one=True
        )
        learner['total_points'] = result['total_points']

        result = execute_query(
            "SELECT COUNT(*) as badge_count FROM user_badges WHERE user_id = %s",
            (learner['id'],),
            fetch_one=True
        )
        learner['badge_count'] = result['badge_count']

    return jsonify(dict_to_json_serializable(learners))

@app.route('/trainer/learners/<int:learner_id>', methods=['GET'])
@token_required
@trainer_required
def get_learner_details(current_user, learner_id):
    # Verify the learner has taken the trainer's modules
    result = execute_query(
        "SELECT 1 FROM user_progress up "
        "JOIN module_content mc ON up.content_id = mc.id "
        "JOIN modules m ON mc.module_id = m.id "
        "WHERE up.user_id = %s AND m.created_by = %s LIMIT 1",
        (learner_id, current_user['id']),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Learner not found or unauthorized'}), 404

    # Get learner details
    learner = execute_query(
        "SELECT u.*, e.name as employer_name FROM users u "
        "LEFT JOIN employers e ON u.employer_id = e.id "
        "WHERE u.id = %s",
        (learner_id,),
        fetch_one=True
    )

    # Get modules progress
    modules_progress = execute_query(
        "SELECT m.id, m.title, m.category, "
        "COUNT(DISTINCT mc.id) as total_content, "
        "COUNT(DISTINCT up.content_id) as completed_content, "
        "MAX(up.last_accessed) as last_accessed "
        "FROM modules m "
        "JOIN module_content mc ON m.id = mc.module_id "
        "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = %s "
        "WHERE m.created_by = %s "
        "GROUP BY m.id, m.title, m.category "
        "ORDER BY last_accessed DESC",
        (learner_id, current_user['id']),
        fetch_all=True
    )

    # Get quiz results
    quiz_results = execute_query(
        "SELECT q.id, q.title as quiz_title, m.title as module_title, "
        "qr.score, qr.max_score, qr.percentage, qr.passed, qr.completed_at "
        "FROM quiz_results qr "
        "JOIN quizzes q ON qr.quiz_id = q.id "
        "JOIN modules m ON q.module_id = m.id "
        "WHERE qr.user_id = %s AND m.created_by = %s "
        "ORDER BY qr.completed_at DESC",
        (learner_id, current_user['id']),
        fetch_all=True
    )

    # Get assignments
    assignments = execute_query(
        "SELECT a.id, m.title as module_title, a.assignment_type, "
        "a.due_date, a.is_mandatory, "
        "COUNT(DISTINCT mc.id) as total_content, "
        "COUNT(DISTINCT up.content_id) as completed_content "
        "FROM assignments a "
        "JOIN modules m ON a.module_id = m.id "
        "JOIN module_content mc ON m.id = mc.module_id "
        "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = %s AND up.status = 'completed' "
        "WHERE (a.assignment_type = 'individual' AND a.individual_id = %s) "
        "OR (a.assignment_type = 'department' AND a.department_id = %s) "
        "OR (a.assignment_type = 'all' AND a.employer_id = %s) "
        "GROUP BY a.id, m.title, a.assignment_type, a.due_date, a.is_mandatory",
        (learner_id, learner_id, learner.get('department_id'), learner.get('employer_id')),
        fetch_all=True
    )

    # Get points history
    points_history = execute_query(
        "SELECT points, reason, awarded_at FROM user_points "
        "WHERE user_id = %s ORDER BY awarded_at DESC",
        (learner_id,),
        fetch_all=True
    )

    # Get badges
    badges = execute_query(
        "SELECT b.*, ub.earned_at FROM badges b "
        "JOIN user_badges ub ON b.id = ub.badge_id "
        "WHERE ub.user_id = %s ORDER BY ub.earned_at DESC",
        (learner_id,),
        fetch_all=True
    )

    return jsonify({
        'learner': dict_to_json_serializable(learner),
        'modules_progress': dict_to_json_serializable(modules_progress),
        'quiz_results': dict_to_json_serializable(quiz_results),
        'assignments': dict_to_json_serializable(assignments),
        'points_history': dict_to_json_serializable(points_history),
        'badges': dict_to_json_serializable(badges)
    })

# trainer dashboard
@app.route('/trainer/dashboard', methods=['GET'])
@token_required
@trainer_required
def trainer_dashboard(current_user):
    # Get trainer's modules
    recent_modules = execute_query(
        "SELECT id, title, category, is_active, created_at FROM modules "
        "WHERE created_by = %s ORDER BY created_at DESC LIMIT 5",
        (current_user['id'],),
        fetch_all=True
    )

    # Get module statistics
    module_stats = []
    for module in recent_modules:
        stats = execute_query(
            "SELECT COUNT(DISTINCT up.user_id) as learners, "
            "AVG(CASE WHEN up.status = 'completed' THEN 1 ELSE 0 END) as completion_rate "
            "FROM module_content mc "
            "LEFT JOIN user_progress up ON mc.id = up.content_id "
            "WHERE mc.module_id = %s",
            (module['id'],),
            fetch_one=True
        )
        module['learners'] = stats['learners'] if stats['learners'] else 0
        module['completion_rate'] = float(stats['completion_rate']) * 100 if stats['completion_rate'] else 0
        module_stats.append(module)

    # Get recent quiz results
    recent_quiz_results = execute_query(
        "SELECT q.title as quiz_title, m.title as module_title, "
        "qr.user_id, u.first_name, u.last_name, qr.score, qr.max_score, qr.passed, qr.completed_at "
        "FROM quiz_results qr "
        "JOIN quizzes q ON qr.quiz_id = q.id "
        "JOIN modules m ON q.module_id = m.id "
        "JOIN users u ON qr.user_id = u.id "
        "WHERE m.created_by = %s "
        "ORDER BY qr.completed_at DESC LIMIT 5",
        (current_user['id'],),
        fetch_all=True
    )

    # Get assignment completion stats
    assignment_stats = execute_query(
        "SELECT a.id, m.title as module_title, "
        "COUNT(DISTINCT a.individual_id) as assigned_to, "
        "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completed_by "
        "FROM assignments a "
        "JOIN modules m ON a.module_id = m.id "
        "LEFT JOIN module_content mc ON m.id = mc.module_id "
        "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = a.individual_id "
        "WHERE m.created_by = %s "
        "GROUP BY a.id, m.title "
        "ORDER BY a.due_date DESC LIMIT 5",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify({
        'recent_modules': dict_to_json_serializable(module_stats),
        'recent_quiz_results': dict_to_json_serializable(recent_quiz_results),
        'assignment_stats': dict_to_json_serializable(assignment_stats)
    })

# Trainer modules
@app.route('/trainer/modules', methods=['GET'])
@token_required
@trainer_required
def get_trainer_modules(current_user):
    # Get all modules created by the trainer with detailed stats
    modules = execute_query(
        "SELECT m.*, "
        "COUNT(DISTINCT mc.id) as content_count, "
        "COUNT(DISTINCT q.id) as quiz_count "
        "FROM modules m "
        "LEFT JOIN module_content mc ON m.id = mc.module_id "
        "LEFT JOIN quizzes q ON m.id = q.module_id "
        "WHERE m.created_by = %s "
        "GROUP BY m.id "
        "ORDER BY m.created_at DESC",
        (current_user['id'],),
        fetch_all=True
    )

    return jsonify({'modules': dict_to_json_serializable(modules)})

@app.route('/trainer/modules/<int:module_id>/stats', methods=['GET'])
@token_required
@trainer_required
def get_module_stats(current_user, module_id):
    # Verify the module belongs to the trainer
    result = execute_query(
        "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
        (module_id, current_user['id']),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Module not found or unauthorized'}), 404

    # Get module details
    module = execute_query(
        "SELECT m.*, "
        "COUNT(DISTINCT mc.id) as content_count, "
        "COUNT(DISTINCT q.id) as quiz_count "
        "FROM modules m "
        "LEFT JOIN module_content mc ON m.id = mc.module_id "
        "LEFT JOIN quizzes q ON m.id = q.module_id "
        "WHERE m.id = %s "
        "GROUP BY m.id",
        (module_id,),
        fetch_one=True
    )

    # Get learner progress
    learner_progress = execute_query(
        "SELECT u.id, u.first_name, u.last_name, u.email, "
        "COUNT(DISTINCT mc.id) as total_content, "
        "COUNT(DISTINCT up.content_id) as completed_content, "
        "MAX(up.last_accessed) as last_accessed "
        "FROM users u "
        "JOIN user_progress up ON u.id = up.user_id "
        "JOIN module_content mc ON up.content_id = mc.id "
        "WHERE mc.module_id = %s "
        "GROUP BY u.id, u.first_name, u.last_name, u.email "
        "ORDER BY last_accessed DESC",
        (module_id,),
        fetch_all=True
    )

    # Get quiz results
    quiz_results = execute_query(
        "SELECT q.title as quiz_title, u.id as user_id, u.first_name, u.last_name, "
        "qr.score, qr.max_score, qr.percentage, qr.passed, qr.completed_at "
        "FROM quiz_results qr "
        "JOIN quizzes q ON qr.quiz_id = q.id "
        "JOIN users u ON qr.user_id = u.id "
        "WHERE q.module_id = %s "
        "ORDER BY qr.completed_at DESC",
        (module_id,),
        fetch_all=True
    )

    # Get assignment status
    assignment_status = execute_query(
        "SELECT a.id, a.assignment_type, a.due_date, a.is_mandatory, "
        "COUNT(DISTINCT a.individual_id) as assigned_to, "
        "COUNT(DISTINCT CASE WHEN up.status = 'completed' THEN up.user_id END) as completed_by "
        "FROM assignments a "
        "LEFT JOIN module_content mc ON a.module_id = mc.module_id "
        "LEFT JOIN user_progress up ON mc.id = up.content_id AND up.user_id = a.individual_id "
        "WHERE a.module_id = %s "
        "GROUP BY a.id, a.assignment_type, a.due_date, a.is_mandatory",
        (module_id,),
        fetch_all=True
    )

    return jsonify({
        'module': dict_to_json_serializable(module),
        'learner_progress': dict_to_json_serializable(learner_progress),
        'quiz_results': dict_to_json_serializable(quiz_results),
        'assignment_status': dict_to_json_serializable(assignment_status)
    })

@app.route('/offline-content', methods=['GET'])
@token_required
def get_offline_content(current_user):
    user_offline_dir = os.path.join(app.config['OFFLINE_CONTENT_DIR'], str(current_user['id']))
    if not os.path.exists(user_offline_dir):
        return jsonify({'offline_content': [], 'total_size': 0})

    offline_content = []
    total_size = 0

    # Get all downloaded content IDs
    for content_id in os.listdir(user_offline_dir):
        content_path = os.path.join(user_offline_dir, content_id)
        if os.path.isfile(content_path):
            total_size += os.path.getsize(content_path)

            # Get content info from database
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

# Progress Tracking Routes
@app.route('/progress', methods=['POST'])
@token_required
def update_progress(current_user):
    data = request.get_json()
    required_fields = ['content_id', 'status']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Content ID and status are required'}), 400

    # Check if content exists
    result = execute_query(
        "SELECT 1 FROM module_content WHERE id = %s",
        (data['content_id'],),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Content not found'}), 404

    # Check if progress record exists
    progress = execute_query(
        "SELECT * FROM user_progress WHERE user_id = %s AND content_id = %s",
        (current_user['id'], data['content_id']),
        fetch_one=True
    )

    if progress:
        # Update existing progress
        execute_query(
            "UPDATE user_progress SET status = %s, current_position = %s, "
            "completed_at = %s, last_accessed = %s, attempts = %s, score = %s "
            "WHERE user_id = %s AND content_id = %s",
            (
                data['status'], data.get('current_position'),
                datetime.now(timezone.utc)if data['status'] == 'completed' else None,
                datetime.utcnow(), data.get('attempts', 0),
                data.get('score'), current_user['id'], data['content_id']
            )
        )
    else:
        # Create new progress record
        execute_query(
            "INSERT INTO user_progress (user_id, content_id, status, started_at, "
            "completed_at, last_accessed, current_position, attempts, score) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (
                current_user['id'], data['content_id'], data['status'],
                datetime.utcnow(),
                datetime.now(timezone.utc)if data['status'] == 'completed' else None,
                datetime.utcnow(), data.get('current_position'),
                data.get('attempts', 0), data.get('score')
            )
        )

    # Award points if content was completed
    if data['status'] == 'completed':
        points_result = award_points(
            current_user['id'],
            app.config['POINTS_FOR_COMPLETION'],
            f"Completed content {data['content_id']}"
        )

        # Update leaderboard
        if current_user.get('employer_id'):
            update_leaderboard(current_user['id'], current_user['employer_id'])

    response = {'message': 'Progress updated successfully'}
    if data['status'] == 'completed':
        response['points_awarded']
        if points_result.get('badges_awarded'):
            response['badges_awarded'] = points_result['badges_awarded']

   

@app.route('/progress/summary', methods=['GET'])
@token_required
def get_progress_summary(current_user):
    # Get total modules count
    result = execute_query(
        "SELECT COUNT(*) as total_modules FROM modules WHERE is_active = TRUE",
        fetch_one=True
    )
    total_modules = result['total_modules']

    # Get completed modules count
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

    # Get total points
    result = execute_query(
        "SELECT COALESCE(SUM(points), 0) as total_points FROM user_points WHERE user_id = %s",
        (current_user['id'],),
        fetch_one=True
    )
    total_points = result['total_points']

    # Get badges count
    result = execute_query(
        "SELECT COUNT(*) as badges_count FROM user_badges WHERE user_id = %s",
        (current_user['id'],),
        fetch_one=True
    )
    badges_count = result['badges_count']

    # Get recent activity
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

# Assignment Routes
@app.route('/assignments', methods=['POST'])
@token_required
@trainer_required
def create_assignment(current_user):
    data = request.get_json()
    required_fields = ['module_id', 'assignment_type']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Module ID and assignment type are required'}), 400

    # Verify module exists
    result = execute_query(
        "SELECT * FROM modules WHERE id = %s",
        (data['module_id'],),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Module not found'}), 404

    # Create assignment
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
    # Get assignments for the current user
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
        # Get module completion status
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
    # Verify assignment exists and was created by the current user (if not admin)
    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM assignments WHERE id = %s AND assigned_by = %s",
            (assignment_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Assignment not found or unauthorized'}), 404

    # Delete assignment
    execute_query(
        "DELETE FROM assignments WHERE id = %s",
        (assignment_id,)
    )

    return jsonify({'message': 'Assignment deleted successfully'})

# Badge Routes
@app.route('/badges', methods=['GET'])
@token_required
def get_all_badges(current_user):
    # Get all badges
    badges = execute_query(
        "SELECT * FROM badges",
        fetch_all=True
    )

    # Check which badges the user has earned
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
    # Get badges earned by the user
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
    data = request.get_json()
    required_fields = ['user_id', 'badge_id']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'User ID and Badge ID are required'}), 400

    # Check if badge exists
    result = execute_query(
        "SELECT 1 FROM badges WHERE id = %s",
        (data['badge_id'],),
        fetch_one=True
    )
    if not result:
        return jsonify({'message': 'Badge not found'}), 404

    # Check if user already has this badge
    result = execute_query(
        "SELECT 1 FROM user_badges WHERE user_id = %s AND badge_id = %s",
        (data['user_id'], data['badge_id']),
        fetch_one=True
    )
    if result:
        return jsonify({'message': 'User already has this badge'}), 400

    # Award badge
    execute_query(
        "INSERT INTO user_badges (user_id, badge_id, earned_at) "
        "VALUES (%s, %s, %s)",
        (data['user_id'], data['badge_id'], datetime.utcnow())
    )

    # Get badge details for notification
    badge = execute_query(
        "SELECT name, description FROM badges WHERE id = %s",
        (data['badge_id'],),
        fetch_one=True
    )

    # Get user details for notification
    user = execute_query(
        "SELECT email, first_name FROM users WHERE id = %s",
        (data['user_id'],),
        fetch_one=True
    )

    # Send badge award notification
    notification_template = f"""
        <h1>Congratulations! You Earned a Badge</h1>
        <p>Dear {user['first_name']},</p>
        <p>You have been awarded the <strong>{badge['name']}</strong> badge!</p>
        <p>{badge['description']}</p>
        <p>Keep up the great work!</p>
        <p>Best regards,<br>Hospitality Training Team</p>
    """
    send_email(user['email'], f"New Badge: {badge['name']}", notification_template)

    return jsonify({'message': 'Badge awarded successfully'})

# Leaderboard Routes
@app.route('/leaderboard', methods=['GET'])
@token_required
def get_leaderboard(current_user):
    # Get leaderboard within the user's organization
    leaderboard = execute_query(
        "SELECT u.id, u.first_name, u.last_name, u.profile_picture, "
        "l.total_points, l.badges_count, l.modules_completed "
        "FROM leaderboard l "
        "JOIN users u ON l.user_id = u.id "
        "WHERE l.employer_id = %s "
        "ORDER BY l.total_points DESC "
        "LIMIT 20",
        (current_user.get('employer_id'),),
        fetch_all=True
    )

    # Add rank to each user
    for rank, user_data in enumerate(leaderboard, start=1):
        user_data['rank'] = rank

    # Add current user's position if not in top 20
    current_user_in_leaderboard = any(user['id'] == current_user['id'] for user in leaderboard)
    if not current_user_in_leaderboard:
        current_user_rank = execute_query(
            "SELECT COUNT(*) + 1 as rank FROM leaderboard "
            "WHERE employer_id = %s AND total_points > ("
            "SELECT total_points FROM leaderboard WHERE user_id = %s AND employer_id = %s"
            ")",
            (current_user.get('employer_id'), current_user['id'], current_user.get('employer_id')),
            fetch_one=True
        )

        current_user_data = execute_query(
            "SELECT u.id, u.first_name, u.last_name, u.profile_picture, "
            "l.total_points, l.badges_count, l.modules_completed "
            "FROM leaderboard l "
            "JOIN users u ON l.user_id = u.id "
            "WHERE l.user_id = %s AND l.employer_id = %s",
            (current_user['id'], current_user.get('employer_id')),
            fetch_one=True
        )

        if current_user_data and current_user_rank:
            current_user_data['rank'] = current_user_rank['rank']
            leaderboard.append(current_user_data)

    return jsonify(dict_to_json_serializable(leaderboard))

# Content Management Routes (Trainer/Admin only)
@app.route('/modules', methods=['POST'])
@token_required
@trainer_required
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
    required_fields = ['content_type', 'title', 'display_order']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Content type, title and display order are required'}), 400

    # Verify module exists and belongs to the trainer (if not admin)
    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
            (module_id, current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

    # Add content
    content_id = execute_query(
        "INSERT INTO module_content (module_id, content_type, title, description, "
        "url, file_path, duration, display_order, is_downloadable) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            module_id, data['content_type'], data['title'], data.get('description'),
            data.get('url'), data.get('file_path'), data.get('duration'),
            data['display_order'], data.get('is_downloadable', False)
        ),
        lastrowid=True
    )

    # If it's a YouTube video, add to youtube_videos table
    if data['content_type'] == 'video' and data.get('youtube_video_id'):
        execute_query(
            "INSERT INTO youtube_videos (content_id, youtube_video_id, title, "
            "channel_name, duration, thumbnail_url) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                content_id, data['youtube_video_id'], data.get('video_title', data['title']),
                data.get('channel_name'), data.get('duration'), data.get('thumbnail_url')
            )
        )

    return jsonify({
        'message': 'Content added successfully',
        'content_id': content_id
    }), 201

@app.route('/modules/<int:module_id>/activate', methods=['PUT'])
@token_required
@trainer_required
def activate_module(current_user, module_id):
    # Verify module exists and belongs to the trainer (if not admin)
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
    # Verify module exists and belongs to the trainer (if not admin)
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

# Quiz Routes
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

    # Verify module exists and belongs to the trainer (if not admin)
    if current_user['role'] == 'trainer':
        result = execute_query(
            "SELECT 1 FROM modules WHERE id = %s AND created_by = %s",
            (data['module_id'], current_user['id']),
            fetch_one=True
        )
        if not result:
            return jsonify({'message': 'Module not found or unauthorized'}), 404

    # Create quiz
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

    # Add questions
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
    # Get quizzes for the module
    quizzes = execute_query(
        "SELECT * FROM quizzes WHERE module_id = %s AND is_active = TRUE",
        (module_id,),
        fetch_all=True
    )

    # For each quiz, check if user has taken it and their score
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

@app.route('/quizzes/<int:quiz_id>', methods=['GET'])
@token_required
def get_quiz(current_user, quiz_id):
    # Get quiz details
    quiz = execute_query(
        "SELECT * FROM quizzes WHERE id = %s AND is_active = TRUE",
        (quiz_id,),
        fetch_one=True
    )

    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404

    # Get questions
    questions = execute_query(
        "SELECT id, question_text, question_type, options, points "
        "FROM quiz_questions WHERE quiz_id = %s",
        (quiz_id,),
        fetch_all=True
    )

    # Don't include correct answers in the response
    for question in questions:
        question.pop('correct_answer', None)

    quiz['questions'] = questions

    # Check if user has already taken this quiz
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
    data = request.get_json()
    if 'answers' not in data or not isinstance(data['answers'], list):
        return jsonify({'message': 'Answers are required'}), 400

    # Get quiz details
    quiz = execute_query(
        "SELECT * FROM quizzes WHERE id = %s AND is_active = TRUE",
        (quiz_id,),
        fetch_one=True
    )

    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404

    # Get questions and correct answers
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

    for question in questions:
        correct_answers[str(question['id'])] = question['correct_answer']

    user_answers = {}
    for answer in data['answers']:
        if 'question_id' not in answer or 'answer' not in answer:
            return jsonify({'message': 'Invalid answer format'}), 400

        question_id = str(answer['question_id'])
        user_answer = answer['answer']
        user_answers[question_id] = user_answer

        if question_id in correct_answers and user_answer == correct_answers[question_id]:
            total_score += next((q['points'] for q in questions if str(q['id']) == question_id), 0)

    percentage = (total_score / max_score) * 100 if max_score > 0 else 0
    passed = percentage >= quiz['passing_score']

    # Save quiz result
    execute_query(
        "INSERT INTO quiz_results (user_id, quiz_id, score, max_score, "
        "percentage, passed, answers, correct_answers, completed_at) "
        "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
        (
            current_user['id'], quiz_id, total_score, max_score,
            percentage, passed, json.dumps(user_answers), json.dumps(correct_answers),
            datetime.utcnow()
        )
    )

    # Award points if passed
    if passed:
        points_result = award_points(
            current_user['id'],
            app.config['POINTS_FOR_QUIZ'],
            f"Completed quiz {quiz_id} with score {percentage}%"
        )

        # Update leaderboard
        if current_user.get('employer_id'):
            update_leaderboard(current_user['id'], current_user['employer_id'])

    response = {
        'message': 'Quiz submitted successfully',
        'score': total_score,
        'max_score': max_score,
        'percentage': percentage,
        'passed': passed
    }

    if passed:
        response['points_awarded'] = app.config['POINTS_FOR_QUIZ']
        if points_result.get('badges_awarded'):
            response['badges_awarded'] = points_result['badges_awarded']

    return jsonify(response)

# Notification Routes
@app.route('/notifications', methods=['GET'])
@token_required
def get_notifications(current_user):
    # Get unread notifications
    unread_notifications = execute_query(
        "SELECT * FROM notifications WHERE user_id = %s AND is_read = FALSE "
        "ORDER BY created_at DESC",
        (current_user['id'],),
        fetch_all=True
    )

    # Get read notifications (last 10)
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

# Dashboard Stats (Admin/Trainer)
@app.route('/dashboard/stats', methods=['GET'])
@token_required
@trainer_required
def get_dashboard_stats(current_user):
    stats = {}

    # Total users
    if current_user['role'] == 'admin':
        result = execute_query("SELECT COUNT(*) as total_users FROM users", fetch_one=True)
    else:
        result = execute_query(
            "SELECT COUNT(*) as total_users FROM users WHERE employer_id = %s",
            (current_user.get('employer_id'),),
            fetch_one=True
        )
    stats['total_users'] = result['total_users']

    # Active users
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

    # Total modules
    if current_user['role'] == 'admin':
        result = execute_query("SELECT COUNT(*) as total_modules FROM modules", fetch_one=True)
    else:
        result = execute_query(
            "SELECT COUNT(*) as total_modules FROM modules WHERE created_by = %s",
            (current_user['id'],),
            fetch_one=True
        )
    stats['total_modules'] = result['total_modules']

    # Active modules
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

    # Recent activity
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

# Error Handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    app.logger.error(f'Server error: {str(error)}')
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

if __name__ == '__main__':
    app.run(debug=True)