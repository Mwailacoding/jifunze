import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Award, 
  Users, 
  TrendingUp, 
  Play,
  CheckCircle,
  Star,
  ArrowRight,
  ChevronDown,
  X,
  Menu,
  Globe,
  Clock,
  Smartphone,
  BarChart2,
  Bookmark,
  Shield,
  Download,
  Headphones,
  Code,
  Database,
  Cloud,
  Zap
} from 'lucide-react';
import { motion, useAnimation, useInView, AnimatePresence, useTransform, useScroll } from 'framer-motion';
import Lottie from 'lottie-react';

// Mock animation data (included directly in the component)
const heroAnimationData = {
  "v": "5.9.1",
  "fr": 60,
  "ip": 0,
  "op": 120,
  "w": 500,
  "h": 500,
  "nm": "Book Animation",
  "layers": [
    {
      "ty": 4,
      "nm": "Book",
      "ks": {
        "o": { "a": 0, "k": 100 },
        "r": { "a": 1, "k": [{ "t": 0, "s": [0] }, { "t": 120, "s": [360] }] },
        "p": { "a": 0, "k": [250,250,0] },
        "a": { "a": 0, "k": [0,0,0] },
        "s": { "a": 0, "k": [100,100,100] }
      },
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "rc",
              "s": { "a": 0, "k": [300,400] },
              "p": { "a": 0, "k": [0,0] }
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [0.482,0.008,0.008,1] }
            }
          ]
        }
      ]
    }
  ]
};

const scrollAnimationData = {
  "v": "5.9.1",
  "fr": 60,
  "ip": 0,
  "op": 60,
  "w": 100,
  "h": 100,
  "nm": "Scroll Indicator",
  "layers": [
    {
      "ty": 4,
      "nm": "Arrow",
      "ks": {
        "p": { "a": 1, "k": [{ "t": 0, "s": [50,30,0] }, { "t": 60, "s": [50,70,0] }] },
        "a": { "a": 0, "k": [0,0,0] }
      },
      "shapes": [
        {
          "ty": "gr",
          "it": [
            {
              "ty": "path",
              "ks": {
                "a": 0,
                "k": {
                  "v": [[0,-15], [10,0], [-10,0]],
                  "closed": true
                }
              }
            },
            {
              "ty": "fl",
              "c": { "a": 0, "k": [0.267,0.141,0.902,1] }
            }
          ]
        }
      ]
    }
  ]
};

// Floating Elements (replaced 3D elements with simple animated divs)
const FloatingElement = ({ position, size, delay }: { position: string; size: string; delay: number }) => (
  <motion.div
    className={`absolute ${position} opacity-70`}
    initial={{ scale: 0 }}
    animate={{ 
      scale: 1,
      transition: { 
        delay,
        type: 'spring', 
        damping: 10, 
        stiffness: 100 
      } 
    }}
    whileHover={{
      scale: 1.1,
      rotate: 5
    }}
  >
    <div className={`${size} bg-gradient-to-br from-primary-100 to-secondary-100 rounded-2xl`}></div>
  </motion.div>
);

// Feature Card with hover effect
const FeatureCard = ({ icon: Icon, title, description, index, color }: { 
  icon: React.ComponentType<any>; 
  title: string; 
  description: string; 
  index: number;
  color: string;
}) => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -100px 0px" });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 50 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: {
            delay: index * 0.1,
            duration: 0.5,
            ease: "easeOut"
          }
        }
      }}
      className="card p-6 text-center card-hover relative overflow-hidden group"
      whileHover={{ 
        y: -10,
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 from-primary-500/10 to-secondary-500/10"></div>
      <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center mx-auto mb-4 relative z-10`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 mb-2 relative z-10">
        {title}
      </h3>
      <p className="text-neutral-600 relative z-10">
        {description}
      </p>
      <motion.div 
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-0 group-hover:opacity-100 transition-opacity"
        initial={{ width: 0 }}
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.5 }}
      />
    </motion.div>
  );
};

// Enhanced Testimonial Card with tilt effect
const TestimonialCard = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const testimonials = [
    {
      rating: "4.9/5",
      quote: "This platform transformed how our team approaches professional development. The gamification elements keep everyone engaged!",
      author: "Ivy Malika, HR Director",
      avatar: "https://randomuser.me/api/portraits/women/44.jpg"
    },
    {
      rating: "4.7/5",
      quote: "The quality of content is exceptional. I've completed 3 certifications and each one has directly helped my career advancement.",
      author: "Shalom Maliak, Software Engineer",
      avatar: "https://randomuser.me/api/portraits/men/32.jpg"
    },
    {
      rating: "5/5",
      quote: "As a busy professional, the mobile access and bite-sized lessons make it possible to learn during my commute. Highly recommend!",
      author: "Mitchelle Malika, Marketing Manager",
      avatar: "https://randomuser.me/api/portraits/women/63.jpg"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const x = e.clientX - cardRef.current.getBoundingClientRect().left;
    const y = e.clientY - cardRef.current.getBoundingClientRect().top;
    
    const centerX = cardRef.current.offsetWidth / 2;
    const centerY = cardRef.current.offsetHeight / 2;
    
    const rotateY = (x - centerX) / 20;
    const rotateX = (centerY - y) / 20;
    
    cardRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (cardRef.current) {
      cardRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }
  };

  return (
    <div className="relative h-64">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeIndex}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-primary-500 to-secondary-500 rounded-2xl p-8 text-white absolute inset-0 overflow-hidden"
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{
            transformStyle: 'preserve-3d',
            transition: 'transform 0.1s ease-out'
          }}
        >
          <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
          <div className="flex items-center space-x-4 mb-6 relative z-10">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold">{testimonials[activeIndex].rating}</div>
              <div className="text-white/80">Average Rating</div>
            </div>
          </div>
          <blockquote className="text-lg mb-4 relative z-10">
            "{testimonials[activeIndex].quote}"
          </blockquote>
          <div className="flex items-center space-x-3 relative z-10">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              <img 
                src={testimonials[activeIndex].avatar} 
                alt={testimonials[activeIndex].author} 
                className="w-full h-full object-cover"
              />
            </div>
            <cite className="text-white/80">- {testimonials[activeIndex].author}</cite>
          </div>
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
            {testimonials.map((_, idx) => (
              <button 
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`w-2 h-2 rounded-full ${idx === activeIndex ? 'bg-white' : 'bg-white/30'}`}
                aria-label={`View testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

// Enhanced Stats Counter
const StatsCounter = ({ number, label, icon: Icon }: { number: string; label: string; icon: React.ComponentType<any> }) => {
  const controls = useAnimation();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      controls.start("visible");
    }
  }, [isInView, controls]);

  const isPercentage = number.includes('%');
  const targetNumber = isPercentage ? parseFloat(number) : parseInt(number.replace(/,/g, ''));

  return (
    <motion.div
      ref={ref}
      className="text-center p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
      initial="hidden"
      animate={controls}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { 
          opacity: 1, 
          y: 0,
          transition: { duration: 0.5 }
        }
      }}
      whileHover={{
        y: -5,
        transition: { type: "spring", stiffness: 300 }
      }}
    >
      <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-primary-600" />
      </div>
      <div className="text-4xl font-bold text-primary-600 mb-2">
        {number}
      </div>
      <div className="text-neutral-600 font-medium">{label}</div>
    </motion.div>
  );
};

// Scroll Indicator
const ScrollIndicator = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  
  useEffect(() => {
    const updateScrollProgress = () => {
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (scrollPx / winHeightPx) * 100;
      setScrollProgress(scrolled);
    };
    
    window.addEventListener('scroll', updateScrollProgress);
    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
      <motion.div 
        className="relative"
        animate={{ y: [0, -5, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Lottie 
          animationData={scrollAnimationData} 
          loop={true} 
          style={{ width: 60, height: 60 }}
        />
        <div className="absolute top-0 left-0 right-0 bottom-0 flex items-center justify-center">
          <div className="relative w-6 h-6">
            <svg className="w-full h-full" viewBox="0 0 36 36">
              <motion.path
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="#4F46E5"
                strokeWidth="2"
                strokeDasharray="100, 100"
                initial={{ strokeDashoffset: 100 }}
                animate={{ strokeDashoffset: 100 - scrollProgress }}
                transition={{ duration: 0.1 }}
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Video Modal with tilt effect
const VideoModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!modalRef.current) return;
    
    const x = e.clientX - modalRef.current.getBoundingClientRect().left;
    const y = e.clientY - modalRef.current.getBoundingClientRect().top;
    
    const centerX = modalRef.current.offsetWidth / 2;
    const centerY = modalRef.current.offsetHeight / 2;
    
    const rotateY = (x - centerX) / 50;
    const rotateX = (centerY - y) / 50;
    
    modalRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  };

  const handleMouseLeave = () => {
    if (modalRef.current) {
      modalRef.current.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl bg-black rounded-xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              transformStyle: 'preserve-3d',
              transition: 'transform 0.2s ease-out'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-secondary-500/20 pointer-events-none"></div>
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
              aria-label="Close video"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="aspect-w-16 aspect-h-9">
              <iframe
                className="w-full h-full"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Demo Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Mobile Menu
const MobileMenu = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-40 bg-white/95 backdrop-blur-md"
        >
          <div className="container mx-auto px-4 py-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-neutral-900">Jifunze Mara</span>
              </div>
              <button onClick={onClose} className="p-2">
                <X className="w-6 h-6 text-neutral-600" />
              </button>
            </div>
            <nav className="flex-1 flex flex-col justify-center space-y-8">
              <Link
                to="/login"
                className="text-3xl font-medium text-neutral-600 hover:text-primary-600 transition-colors"
                onClick={onClose}
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary text-xl py-4 px-6 text-center block"
                onClick={onClose}
              >
                Get Started
              </Link>
            </nav>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Hero Section
const HeroSection = () => {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["end end", "start start"]
  });
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 1.2]);

  return (
    <section ref={heroRef} className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 pt-32 pb-20 overflow-hidden">
      <motion.div 
        className="absolute inset-0 bg-gradient-to-b from-white to-transparent opacity-50"
        style={{ opacity }}
      />
      
      {/* Background Elements */}
      <FloatingElement position="top-20 left-10" size="w-32 h-32" delay={0.5} />
      <FloatingElement position="bottom-20 right-10" size="w-40 h-40" delay={0.7} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div 
            className="text-center lg:text-left"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.h1 
              className="text-5xl md:text-6xl font-bold text-neutral-900 mb-6 leading-tight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Transform Your
              <motion.span 
                className="block text-primary-600"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                Learning Journey
              </motion.span>
            </motion.h1>
            <motion.p 
              className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto lg:mx-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              Join thousands of professionals advancing their skills through our comprehensive 
              training platform. Learn at your own pace, earn certifications, and unlock your potential.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
            >
              <motion.div 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  to="/register"
                  className="btn-primary text-lg px-8 py-4 flex items-center space-x-2"
                >
                  <span>Start Learning</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>
              <motion.button 
                className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
                onClick={() => setIsVideoOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                
              </motion.button>
            </motion.div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
            className="hidden lg:block"
          >
            <Lottie 
              animationData={heroAnimationData} 
              loop={true} 
              className="w-full h-full"
            />
          </motion.div>
        </div>
      </div>
      
      <VideoModal isOpen={isVideoOpen} onClose={() => setIsVideoOpen(false)} />
    </section>
  );
};

// Features Section
const FeaturesSection = () => {
  const features = [
    {
      icon: BookOpen,
      title: 'Interactive Learning',
      description: 'Engage with dynamic content including videos, documents, and interactive quizzes.',
      color: 'bg-gradient-to-br from-blue-500 to-indigo-500'
    },
    {
      icon: Award,
      title: 'Gamified Experience',
      description: 'Earn points, unlock badges, and compete on leaderboards to stay motivated.',
      color: 'bg-gradient-to-br from-purple-500 to-pink-500'
    },
    {
      icon: BarChart2,
      title: 'Skill Analytics',
      description: 'Get detailed insights into your skill development and growth.',
      color: 'bg-gradient-to-br from-orange-500 to-yellow-500'
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-neutral-50 to-primary-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: "0px 0px -100px 0px" }}
        >
          <h2 className="text-4xl font-bold text-neutral-900 mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
            Our platform combines cutting-edge technology with proven learning methodologies 
            to deliver an exceptional training experience.
          </p>
        </motion.div>

        <div className="flex flex-col gap-8 md:flex-row md:gap-8 lg:grid lg:grid-cols-3 lg:gap-12">
          {features.map((feature, index) => (
            <FeatureCard 
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
              color={feature.color}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

// Enhanced Landing Page
export const LandingPage: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <ScrollIndicator />
      <MobileMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Header */}
      <motion.header 
        className="bg-white/95 backdrop-blur-md shadow-sm fixed w-full z-30"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 200 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-neutral-900">Jifunze Mara</span>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <Link
                to="/login"
                className="text-neutral-600 hover:text-primary-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn-primary"
              >
                Get Started
              </Link>
            </div>
            <button 
              className="md:hidden p-2"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-neutral-600" />
            </button>
          </div>
        </div>
      </motion.header>

      <HeroSection />
      <FeaturesSection />

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary-500 to-secondary-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.h2 
            className="text-4xl font-bold text-white mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Ready to Start Your Learning Journey?
          </motion.h2>
          <motion.p 
            className="text-xl text-white/90 mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            Join thousands of professionals who have already transformed their careers 
            through our comprehensive training platform.
          </motion.p>
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/register"
                className="bg-white text-primary-600 hover:bg-neutral-100 font-semibold py-4 px-8 rounded-lg transition-colors text-lg flex items-center justify-center space-x-2"
              >
                <span>Create Free Account</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Link
                to="/login"
                className="border-2 border-white text-white hover:bg-white hover:text-primary-600 font-semibold py-4 px-8 rounded-lg transition-colors text-lg"
              >
                Sign In
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <motion.div 
              className="md:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Jifunze Mara</span>
              </div>
              <p className="text-neutral-400 mb-4">
                Empowering professionals through comprehensive training and development.
              </p>
              <p className="text-neutral-500 text-sm">
                © 2025 Jifunze Mara Training Platform. All rights reserved.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-neutral-400 hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/careers" className="text-neutral-400 hover:text-white transition-colors">Careers</Link></li>
                <li><Link to="/blog" className="text-neutral-400 hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/press" className="text-neutral-400 hover:text-white transition-colors">Press</Link></li>
              </ul>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-neutral-400 hover:text-white transition-colors">Help Center</Link></li>
                <li><Link to="/contact" className="text-neutral-400 hover:text-white transition-colors">Contact</Link></li>
                <li><Link to="/privacy" className="text-neutral-400 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-neutral-400 hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </motion.div>
          </div>
        </div>
      </footer>
    </div>
  );
};