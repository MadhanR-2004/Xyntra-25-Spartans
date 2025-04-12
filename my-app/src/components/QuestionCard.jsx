// QuestionCard.jsx
import React from "react";
import Lottie from "lottie-react";
import loadingAnimation from "../animation/Evaluating.json";

const QuestionCard = ({ questionTitle, questionText, isLoading }) => {
  return (
    <div className="card feature-card">
      <div className="card-body">
        {isLoading ? (
          <>
            <Lottie animationData={loadingAnimation} loop={true} style={{ height: 120, margin: "0 auto" }} />
            <p className="text-primary">Generating question... Please wait.</p>
          </>
        ) : (
          <>
            <h2 className="text-center">{questionTitle}</h2>
            <div className="question-content">
              {questionText}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;