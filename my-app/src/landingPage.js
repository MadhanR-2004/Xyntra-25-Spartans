
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Lottie from "lottie-react";
import heroAnimation from "./animation/coding.json";
import challengeAnimation from "./animation/generating.json";
import feedbackAnimation from "./animation/feedback.json";
import progressAnimation from "./animation/generating.json";
import { signInWithGoogle, auth } from "./firebase"; // Import Firebase auth functions
import { onAuthStateChanged } from "firebase/auth"; // Import for auth state monitoring
import "./landingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [count, setCount] = useState({ users: 0, challenges: 0, solutions: 0 });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [user, setUser] = useState(null);
  
  // Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            // Start counter animation when stats section is visible
            animateCounters();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    const statsSection = document.querySelector('.stats-section');
    if (statsSection) observer.observe(statsSection);

    return () => {
      if (statsSection) observer.unobserve(statsSection);
    };
  }, []);

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Store the current user in state
      setUser(currentUser);
      
      // If user is authenticated and we're in the authenticating state, navigate to app
      if (currentUser && isAuthenticating) {
        setIsAuthenticating(false);
        navigate("/home");
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [navigate, isAuthenticating]);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Counter animation
  const animateCounters = () => {
    const duration = 2000; // ms
    const steps = 50;
    const stepTime = duration / steps;
    const finalValues = { users: 10000, challenges: 500, solutions: 25000 };
    
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setCount({
        users: Math.floor((current / steps) * finalValues.users),
        challenges: Math.floor((current / steps) * finalValues.challenges),
        solutions: Math.floor((current / steps) * finalValues.solutions),
      });
      
      if (current >= steps) clearInterval(timer);
    }, stepTime);
  };
  
  const handleGetStarted = async () => {
    // If user is already logged in, navigate directly to app
    if (user) {
      navigate("/home");
      return;
    }
    
    // Otherwise proceed with authentication
    try {
      setIsAuthenticating(true);
      // Attempt to sign in with Google
      const result = await signInWithGoogle();
      
      // If sign-in is successful and user exists, navigation will happen in the useEffect
      if (!result) {
        // If sign-in failed or was cancelled
        setIsAuthenticating(false);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setIsAuthenticating(false);
    }
  };

  // Sample testimonials
  const testimonials = [
    {
      name: "Ram Surath",
      role: "Student",
      image: "user1.jpg",
      text: "As a building's stability relies on its foundation, code depends on logic and structure.CodeCraft helps you strengthen the basics with instant feedback—an excellent way to learn.Highly recommended for beginners!."
    },
    {
      name: "Naganathan",
      role: "Student",
      image: "user2.jpg",
      text: "CodeCraft is highly user-friendly and guides me like a mentor at every step. I find it extremely helpful."
    },
    // {
    //   name: "Michael Chen",
    //   role: "Coding Bootcamp Graduate",
    //   image: "https://i.pravatar.cc/150?img=8",
    //   text: "After my bootcamp, I needed a way to continue practicing. This platform has been invaluable for my ongoing learning journey."
    // }
  ];
  
  return (
    <div className="landing-page">
      {/* Animated particles background */}
      <div className="particles-container">
        {[...Array(20)].map((_, index) => (
          <div 
            key={index} 
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 10}s`,
              animationDelay: `${Math.random() * 5}s`
            }}
          />
        ))}
      </div>
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <div className="logo-container">
              <span className="logo">&lt;/&gt;</span>
              <h1>CodeCraft</h1>
            </div>
            <p>Master pseudocode and improve your problem-solving skills! with our interactive platform.</p>
            <button 
              className="btn-primary" 
              onClick={handleGetStarted}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? "Signing in..." : "Get Started"}
              <span className="btn-arrow">→</span>
            </button>
          </div>
          <div className="hero-animation">
            <Lottie animationData={heroAnimation} loop={true} />
          </div>
        </div>
        <div className="scroll-indicator">
          <div className="mouse">
            <div className="wheel"></div>
          </div>
          <div className="scroll-text">Scroll to explore</div>
        </div>
      </section>
      
      {/* Stats Counter Section */}
      <section className="stats-section">
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-value">{count.users.toLocaleString()}+</div>
            <div className="stat-label">Active Users</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{count.challenges.toLocaleString()}+</div>
            <div className="stat-label">Challenges</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{count.solutions.toLocaleString()}+</div>
            <div className="stat-label">Solutions Submitted</div>
          </div>
        </div>
      </section>
      
      {/* Why Choose Us Section */}
      <section className="why-choose">
        <h2>Why Choose Us?</h2>
      </section>
      
      {/* Details Section */}
      <section className="details-section">
        {/* Card 1: Interactive Challenges (Text Left, Animation Right) */}
        <div className="details-row">
          <div className="details-card">
            <div className="card-icon">🧩</div>
            <div className="details-text">
              <h3>Interactive Challenges</h3>
              <p>Solve real-world problems with our interactive pseudocode challenges. Build your algorithmic thinking and coding skills! through hands-on practice.</p>
              <ul className="feature-list">
                <li>Progressive difficulty levels</li>
                <li>Real-world scenarios</li>
                <li>Timed challenges</li>
              </ul>
            </div>
          </div>
          <div className="details-animation">
            <Lottie animationData={challengeAnimation} loop={true} />
          </div>
        </div>
        
        {/* Card 2: Instant Feedback (Text Right, Animation Left) */}
        <div className="details-row">
          <div className="details-card">
            <div className="card-icon">📊</div>
            <div className="details-text">
              <h3>Instant Feedback</h3>
              <p>Get immediate feedback on your solutions to improve faster. Our intelligent system provides personalized suggestions to help you learn from mistakes.</p>
              <ul className="feature-list">
                <li>Line-by-line analysis</li>
                <li>Performance metrics</li>
                <li>Optimization tips</li>
              </ul>
            </div>
          </div>
          <div className="details-animation" style={{ transform: 'scale(1.2)' }}>
            <Lottie animationData={feedbackAnimation} loop={true} />
          </div>
        </div>
        
        {/* Card 3: Track Your Progress (Text Left, Animation Right) */}
        <div className="details-row">
          <div className="details-card">
            <div className="card-icon">📈</div>
            <div className="details-text">
              <h3>Track Your Progress</h3>
              <p>Monitor your growth with detailed statistics and analytics. See your improvement over time and identify areas where you can focus your learning efforts.</p>
              <ul className="feature-list">
                <li>Personal dashboard</li>
                <li>Skill assessment charts</li>
                <li>Achievement badges</li>
              </ul>
            </div>
          </div>
          <div className="details-animation">
            <Lottie animationData={progressAnimation} loop={true} />
          </div>
        </div>
      </section>
      
      {/* Testimonials Section */}
      <section className="testimonials-section">
        <h2>What Our Users Say</h2>
        <div className="testimonials-container">
          <div className="testimonials-track" style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}>
            {testimonials.map((testimonial, index) => (
              <div key={index} className="testimonial-card">
                <div className="testimonial-image">
                  <img src={testimonial.image} alt={testimonial.name} />
                </div>
                <div className="testimonial-content">
                  <p className="testimonial-text">"{testimonial.text}"</p>
                  <h4 className="testimonial-name">{testimonial.name}</h4>
                  <p className="testimonial-role">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="testimonial-indicators">
            {testimonials.map((_, index) => (
              <button 
                key={index} 
                className={`indicator ${activeTestimonial === index ? 'active' : ''}`}
                onClick={() => setActiveTestimonial(index)}
              />
            ))}
          </div>
        </div>
      </section>
      
      {/* Features Grid */}
      <section className="features-grid-section">
        <h2>More Features You'll Love</h2>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon">🌐</div>
            <h3>Community Challenges</h3>
            <p>Compete with others and share your solutions.</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🔍</div>
            <h3>Code Review</h3>
            <p>Get detailed feedback from experienced developers</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">📱</div>
            <h3>Mobile Friendly</h3>
            <p>Practice on any device, anywhere, anytime</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🎮</div>
            <h3>Gamification</h3>
            <p>Earn points, badges, and climb the leaderboards</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">🧠</div>
            <h3>Algorithm Library</h3>
            <p>Learn from extensive documentation and examples</p>
          </div>
          <div className="feature-item">
            <div className="feature-icon">👥</div>
            <h3>Peer Learning</h3>
            <p>Collaborate with others on complex problems</p>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Start Your Coding Journey?</h2>
          <p>Join thousands of developers who are improving their skills with CodeCraft.</p>
          <button 
            className="btn-primary pulse" 
            onClick={handleGetStarted}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? "Signing in..." : "Begin Now"}
            <span className="btn-arrow">→</span>
          </button>
        </div>
        <div className="cta-decoration"></div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="logo-small">&lt;/&gt;</span>
            <span className="logo-text">CodeCraft</span>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h3>Product</h3>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#testimonials">Testimonials</a></li>
                <li><a href="#faq">FAQ</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Resources</h3>
              <ul>
                <li><a href="#docs">Documentation</a></li>
                <li><a href="#tutorials">Tutorials</a></li>
                <li><a href="#blog">Blog</a></li>
                <li><a href="#support">Support</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h3>Company</h3>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#careers">Careers</a></li>
                <li><a href="#contact">Contact</a></li>
                <li><a href="#privacy">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-social">
            <a href="https://facebook.com" className="footer-link" aria-label="Facebook">
              <i className="fab fa-facebook"></i>
            </a>
            <a href="https://twitter.com" className="footer-link" aria-label="Twitter">
              <i className="fab fa-twitter"></i>
            </a>
            <a href="https://instagram.com" className="footer-link" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://github.com" className="footer-link" aria-label="GitHub">
              <i className="fab fa-github"></i>
            </a>
            <a href="https://linkedin.com" className="footer-link" aria-label="LinkedIn">
              <i className="fab fa-linkedin"></i>
            </a>
          </div>
          
          <p className="copyright">© 2025 CodeCraft. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;