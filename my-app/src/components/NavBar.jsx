import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./NavBar.css";

const Navbar = ({ user, userStats, signInWithGoogle, logout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  
  const isHomePage = location.pathname === "/";
  const isAppPage = location.pathname.includes("/home");
  const isProblemStatementsPage = location.pathname.includes("/problemStatements");
  const isSubmissionsPage = location.pathname.includes("/submissions");


  const handleBackClick = () => {
    navigate("/");
    setMenuOpen(false);
  };

  const navigateTo = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleSignIn = () => {
    signInWithGoogle();
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-left">
        {!isHomePage && (
          <button className="back-button" onClick={handleBackClick}>
            <span className="back-button-icon">←</span>
            <span className="back-button-text">Home</span>
          </button>
        )}
        <span className="navbar-brand">CodeCraft</span>
      </div>

      {/* Desktop Navigation */}
      <div className="desktop-nav">
        <button 
          className={`nav-link ${isAppPage ? "active" : ""}`}
          onClick={() => navigateTo("/home")}
        >
          Home
        </button>
        {user ? (
          <div className="user-profile">
            <button className="profile-button" >
              <img
                src={user.photoURL}
                alt="Profile"
                width="40"
                className="profile-image"
              />
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="signin-button" onClick={handleSignIn}>
            Sign in with Google
          </button>
        )}
      </div>

      {/* Mobile Menu Button */}
      <button className="mobile-menu-button" onClick={toggleMenu}>
        {menuOpen ? "✕" : "☰"}
      </button>

      {/* Mobile Navigation */}
      <div className={`mobile-nav ${menuOpen ? "active" : ""}`}>
        <button 
          className={`mobile-nav-link ${isAppPage ? "active" : ""}`}
          onClick={() => navigateTo("/home")}
        >
          Home
        </button>
        
        {user ? (
          <div className="user-profile-mobile">
            <button className="profile-button" >
              <img
                src={user.photoURL}
                alt="Profile"
                width="40"
                className="profile-image"
              />
            </button>
            <button className="logout-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <button className="signin-button-mobile" onClick={handleSignIn}>
            Sign in with Google
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;