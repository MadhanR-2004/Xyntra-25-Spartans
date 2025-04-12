import React from "react";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./Footer.css"; // Import the CSS file

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p className="footer-text">
          &copy; {new Date().getFullYear()} CodeCraft. All rights reserved.
        </p>
        <div className="footer-social">
          <a href="#" className="footer-link">
            <i className="fab fa-facebook"></i>
          </a>
          <a href="#" className="footer-link">
            <i className="fab fa-twitter"></i>
          </a>
          <a href="#" className="footer-link">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="#" className="footer-link">
            <i className="fab fa-linkedin"></i>
          </a>
          <a href="#" className="footer-link">
            <i className="fab fa-github"></i>
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;