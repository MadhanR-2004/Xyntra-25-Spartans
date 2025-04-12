import React from "react";
import Lottie from "lottie-react";
import successAnimation from "../animation/corrcet.json"; // Success animation
import failureAnimation from "../animation/notCorrect.json"; // Failure animation
import loadingAnimation from "../animation/Evaluating.json"; // Loading animation

const EvaluationDialog = ({ score, feedback, isEvaluating, onClose, onNextQuestion }) => {
  return (
    <div className="dialog-overlay">
      <div className="dialog-card">
        <h2>Evaluation Result</h2>

        {/* Show loading animation while evaluating */}
        {isEvaluating ? (
          <>
            <Lottie animationData={loadingAnimation} loop={true} style={{ height: 150 }} />
            <p className="text-primary">Evaluating... Please wait.</p>
          </>
        ) : (
          <>
            {/* Show success or failure animation based on score */}
            {score >= 7 ? (
              <>
                <Lottie animationData={successAnimation} loop={false} style={{ height: 150 }} />
                <p className="text-success">🎉 Congratulations! You scored {score}/10.</p>
              </>
            ) : (
              <>
                <Lottie animationData={failureAnimation} loop={false} style={{ height: 150 }} />
                <p className="text-danger">😞 You scored {score}/10. Try again!</p>
              </>
            )}
            <p className="feedback-text" style={{ height: "150px", overflowY: "auto", padding: "10px", border: "1px solid #ccc" }}>{feedback}</p>

            {/* Show buttons after evaluation */}
            <div className="mt-3">
              {score >= 7 ? (
                <>
                  <button className="btn btn-primary" onClick={onNextQuestion}>
                    Generate Next Question
                  </button>
                  <button className="btn btn-danger" onClick={onClose}>
                    Close
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary" onClick={onClose}>
                  Close
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EvaluationDialog;