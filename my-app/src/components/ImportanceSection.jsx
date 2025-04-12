import React from "react";
import Lottie from "lottie-react";
import coding from "../animation/coding.json";
import "./ImportanceSection.css"; // Import the CSS file

const ImportanceSection = () => {
  return (
    <div className="importance-section">
      <div className="row align-items-center">
        <div className="col-12 col-md-6 lottie-container">
          <Lottie animationData={coding} loop autoplay />
        </div>
        <div className="col-12 col-md-6 importance-text">
          <h2 className="section-title">Why Pseudocode is Important</h2>
          <p className="section-description">
            Pseudocode is a crucial skill for cracking technical interviews. It helps you:
          </p>
          <ul className="benefits-list">
            <li className="benefit-item">
              <span className="icon">✔️</span> Break down complex problems into manageable steps.
            </li>
            <li className="benefit-item">
              <span className="icon">✔️</span> Communicate your thought process clearly to interviewers.
            </li>
            <li className="benefit-item">
              <span className="icon">✔️</span> Focus on logic and structure without worrying about syntax.
            </li>
            <li className="benefit-item">
              <span className="icon">✔️</span> Prepare for coding challenges and real-world problem-solving.
            </li>
          </ul>
          <p className="section-conclusion">
            Mastering pseudocode can significantly improve your chances of landing your dream job!
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImportanceSection;