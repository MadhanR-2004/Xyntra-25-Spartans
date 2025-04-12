import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import confetti from "canvas-confetti";
import Lottie from "react-lottie-player";
import * as loadingAnimation from "./animation/Evaluating.json";
import * as successAnimation from "./animation/corrcet.json";
import * as errorAnimation from "./animation/notCorrect.json";
import ImportanceSection from "./components/ImportanceSection";
import QuestionCard from "./components/QuestionCard";
import EditorCard from "./components/EditorCard";
import EvaluationDialog from "./components/EvaluationDialog";
import Footer from "./components/Footer";
import { doc, collection, getDoc, setDoc, updateDoc, increment, serverTimestamp, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "./firebase"
import "./index.css";

const HomePage = ({ 
  user, 
  userStats, 
  setUserStats,
  navigate,
  totalQuestionsGenerated,
  setTotalQuestionsGenerated,
  userQuestions,
  setUserQuestions,
  currentQuestionId,
  setCurrentQuestionId,
  questionText,
  setQuestionText,
  questionTitle,
  setQuestionTitle,
  fetchUserStats,
  fetchUserQuestions
})  => {
  const confettiCanvasRef = useRef(null);
  const editorCardRef = useRef(null);

  // State management
  const [feedback, setFeedback] = useState("");
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [evaluationScore, setEvaluationScore] = useState(0);
  
  // UI state
  const [isQuestionGenerated, setIsQuestionGenerated] = useState(!!questionText);
  const [animateQuestion, setAnimateQuestion] = useState(true);
  const [animateEditor, setAnimateEditor] = useState(true);
  const [showFloatingScore, setShowFloatingScore] = useState(false);
  const [floatingScoreValue, setFloatingScoreValue] = useState(0);
  const [generateButtonEnabled, setGenerateButtonEnabled] = useState(!questionText);
  
  // Difficulty and topics
  const [selectedDifficulty, setSelectedDifficulty] = useState(
    localStorage.getItem("selectedDifficulty") || "medium"
  );
  const [selectedTopics, setSelectedTopics] = useState(() => {
    const savedTopics = localStorage.getItem("selectedTopics");
    return savedTopics ? JSON.parse(savedTopics) : {
      arrays: false,
      strings: false,
      linkedLists: false,
      trees: false,
      graphs: false,
      dynamicProgramming: false,
      sorting: false,
      searching: false,
      recursion: false
    };
  });
  
  // Animation progress tracking
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 3;
  
  const getSelectedTopicsArray = () => {
    return Object.keys(selectedTopics).filter(topic => selectedTopics[topic]);
  };
  
  const handleSkipQuestion = async () => {
    try {
      if (user) {
        const questionsRef = collection(db, `users/${user.uid}/user_questions`);
        const q = query(
          questionsRef, 
          where("status", "==", "in-progress")
        );
        
        const querySnapshot = await getDocs(q);
        const updatePromises = querySnapshot.docs.map(doc => 
          updateDoc(doc.ref, { status: "skipped" })
        );
        await Promise.all(updatePromises);
        
        setUserQuestions(prev => 
          prev.map(q => 
            q.status === "in-progress" ? { ...q, status: "skipped" } : q
          )
        );
      }

      setIsQuestionGenerated(false);
      setGenerateButtonEnabled(true);
      setQuestionText("");
      setCurrentQuestionId(null);
      setQuestionTitle(`Challenge ${totalQuestionsGenerated}`);
      
      if (editorCardRef.current) {
        editorCardRef.current.clearEditor();
      }
      
      setFeedback("Question skipped! You can now configure and generate a new question.");
    } catch (error) {
      console.error("Error skipping question:", error);
      setFeedback("Unable to skip question. Please try again.");
    }
  };

  const generateQuestion = async () => {
    const topics = getSelectedTopicsArray();
    
    if (topics.length === 0) {
        setFeedback("Please select at least one topic before generating a question.");
        return;
    }
    
    setIsGeneratingQuestion(true);
    setIsQuestionGenerated(false);
    setAnimateQuestion(false);
    setAnimateEditor(false);
    setCurrentStep(1);
    
    try {
        // Get existing titles from Firestore
        let existingTitles = [];
        if (user) {
            const questionsRef = collection(db, `users/${user.uid}/user_questions`);
            const qSnapshot = await getDocs(questionsRef);
            existingTitles = qSnapshot.docs.map(doc => doc.data().title);
        }
        
        setTimeout(() => setCurrentStep(2), 800);
        
        // Send initial request to generate question
        const initialResponse = await fetch("http://127.0.0.1:5000/generate-question", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                difficulty: selectedDifficulty,
                topics: topics,
                existing_titles: existingTitles
            }),
        });
        
        const initialData = await initialResponse.json();
        
        if ((initialData.status === "processing" || initialData.status === "queued") && initialData.request_id) {
            // Start polling for the result with exponential backoff
            let questionData = null;
            let attempts = 0;
            const maxAttempts = 30; // Maximum polling attempts
            let baseDelay = 1000; // Start with 1 second
            let maxDelay = 10000; // Cap at 10 seconds
            
            while (attempts < maxAttempts && !questionData) {
                attempts++;
                
                // Calculate exponential backoff delay
                const delay = Math.min(baseDelay * Math.pow(1.5, attempts - 1), maxDelay);
                
                // Wait based on the calculated delay
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Show progress in the UI
                if (attempts % 3 === 0) {
                    setCurrentStep(3);
                }
                
                // Poll for the question status
                const pollResponse = await fetch(`Access to fetch at 'https://4nnc5hl6-5000.inc1.devtunnels.ms/generate-question' from origin 'https://code-craft-wheat-eight.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource. If an opaque response serves your needs, set the request's mode to 'no-cors' to fetch the resource with CORS disabled./check-question-status/${initialData.request_id}`);
                const pollData = await pollResponse.json();
                
                if (pollData.status === "success") {
                    questionData = pollData;
                    break;
                } else if (pollData.status === "error") {
                    throw new Error(pollData.message || "Error generating question");
                }
                // Continue polling if still processing or queued
            }
            
            if (!questionData) {
                throw new Error("Question generation timed out. Please try again.");
            }
            
            setCurrentStep(3);
            
            setTimeout(async () => {
                const newTotal = totalQuestionsGenerated + 1;
                setQuestionText(questionData.question);
                setQuestionTitle(questionData.title || `Challenge ${newTotal} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`);
                setIsQuestionGenerated(true);
                setTotalQuestionsGenerated(newTotal);
                
                if (user) {
                    const questionId = await storeUserQuestion({
                        title: questionData.title || `Challenge ${newTotal} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`,
                        question: questionData.question,
                        totalQuestions: newTotal,
                        difficulty: selectedDifficulty,
                        topics: topics
                    });
                    setCurrentQuestionId(questionId);
                    
                    // Update stats with new total questions count
                    const statsRef = doc(db, `users/${user.uid}/stats/current`);
                    await updateDoc(statsRef, {
                        totalQuestions: newTotal
                    });
                }
                
                setGenerateButtonEnabled(false);
                setTimeout(() => setAnimateQuestion(true), 400);
                setTimeout(() => setAnimateEditor(true), 800);
            }, 600);
        } else {
            throw new Error(initialData.message || "Invalid response from server");
        }
    } catch (error) {
        console.error("Failed to fetch question:", error);
        setQuestionText("Error loading question. Please try again.");
        setGenerateButtonEnabled(true);
    } finally {
        setTimeout(() => {
            setIsGeneratingQuestion(false);
            setCurrentStep(0);
        }, 1200);
    }
};
  const storeUserQuestion = async (questionData) => {
    try {
      // 1. First clear any existing in-progress questions
      const userQuestionsRef = collection(db, `users/${user.uid}/user_questions`);
      const q = query(
          userQuestionsRef,
          where("status", "==", "in-progress")
      );
      
      const querySnapshot = await getDocs(q);
      const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // 2. Store the new question with all metadata
      const newQuestionRef = doc(collection(db, `users/${user.uid}/user_questions`));
      await setDoc(newQuestionRef, {
          title: questionData.title,
          question: questionData.question,
          totalQuestions: questionData.totalQuestions,
          difficulty: selectedDifficulty,
          topics: questionData.topics,
          status: "in-progress",
          timestamp: serverTimestamp(),
          userId: user.uid,
          bestScore: 0,
          submissionCount: 0
      });

      // 3. Update local state
      setUserQuestions(prev => [
          ...prev.filter(q => q.status !== "in-progress"),
          {
              id: newQuestionRef.id,
              ...questionData,
              status: "in-progress",
              timestamp: new Date().toISOString()
          }
      ]);

      return newQuestionRef.id;
    } catch (error) {
      console.error("Error storing user question:", error);
      setFeedback("Failed to save question progress.");
      return null;
    }
  };
  
  const updateQuestionStatus = async (status) => {
    try {
      const questionsRef = collection(db, `users/${user.uid}/user_questions`);
      const q = query(
        questionsRef, 
        where("status", "==", "in-progress")
      );
      
      const querySnapshot = await getDocs(q);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, { status })
      );
      await Promise.all(updatePromises);
      
      setUserQuestions(prev => 
        prev.map(q => 
          q.status === "in-progress" ? { ...q, status } : q
        )
      );
    } catch (error) {
      console.error("Error updating question status:", error);
    }
  };
  
  const updateUserStats = async (uid, score) => {
    try {
      const statsRef = doc(db, `users/${uid}/stats/current`);
      const statsSnap = await getDoc(statsRef);
  
      if (statsSnap.exists()) {
        const statsData = statsSnap.data();
        const lastActiveDate = statsData.lastActive ? new Date(statsData.lastActive).toDateString() : null;
        const todayDate = new Date().toDateString();
  
        let updatedStreak = statsData.streak || 0;
        let updatedMaxStreak = statsData.maxStreak || 0;
        let updatedDailyQuestions = statsData.dailyQuestions || 0;
        let updatedQuestionsSolved = statsData.questionsSolved || 0;

        if (score >= 7) {
          if (lastActiveDate === todayDate) {
            updatedDailyQuestions += 1;
          } else {
            updatedDailyQuestions = 1;
          }
        }

        if (score >= 7) {
  
          // Daily questions count - always increment when solving a question
          updatedQuestionsSolved += 1;
  
          
          if (lastActiveDate !== todayDate) {
            updatedDailyQuestions = 1;
            
            // Streak calculation
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            if (lastActiveDate === yesterday.toDateString()) {
              updatedStreak += 1;
            } else {
              updatedStreak = 1;
            }
  
            // Update max streak if current streak exceeds it
            if (updatedStreak > updatedMaxStreak) {
              updatedMaxStreak = updatedStreak;
            }
          }
        }
  
        const updateData = {
          lastActive: new Date().toISOString(),
          totalQuestions: totalQuestionsGenerated,
          dailyQuestions: updatedDailyQuestions, // Always update daily count
          questionsSolved: updatedQuestionsSolved
        };
  
        if (score >= 7) {
          updateData.totalScore = increment(score);
          updateData.streak = updatedStreak;
          updateData.maxStreak = updatedMaxStreak;
        }
  
        await updateDoc(statsRef, updateData);
        
        const updatedStats = {
          ...statsData,
          lastActive: new Date().toISOString(),
          totalQuestions: totalQuestionsGenerated,
          dailyQuestions: updatedDailyQuestions,
          questionsSolved: updatedQuestionsSolved
        };
  
        if (score >= 7) {
          updatedStats.totalScore = (statsData.totalScore || 0) + score;
          updatedStats.streak = updatedStreak;
          updatedStats.maxStreak = updatedMaxStreak;
        }
  
        setUserStats(updatedStats);
      }
    } catch (error) {
      console.error("Error updating user stats:", error);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#318CE7', '#00cccc', '#ffffff']
      });
      
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#318CE7', '#00cccc', '#ffffff']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  };

  const evaluatePseudocode = async (pseudocode) => {
    if (!pseudocode.trim()) {
      setFeedback("Please enter pseudocode before submitting.");
      return;
    }
    
    if (!isQuestionGenerated) {
      setFeedback("Wait until the Question is generated.");
      return;
    }
    
    setIsEvaluating(true);
    setShowDialog(true);
  
    try {
      // Initial request to evaluate pseudocode
      const initialResponse = await fetch("http://127.0.0.1:5000/evaluate-pseudocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, pseudocode }),
      });
  
      const initialData = await initialResponse.json();
      
      if (initialData.status === "processing" && initialData.request_id) {
        // Start polling for the result
        let evaluationData = null;
        let attempts = 0;
        const maxAttempts = 30; // Adjust based on expected processing time
        
        while (attempts < maxAttempts && !evaluationData) {
          attempts++;
          
          // Wait a bit before polling
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Poll for the evaluation status
          const pollResponse = await fetch(`http://127.0.0.1:5000/check-evaluation-status/${initialData.request_id}`);
          const pollData = await pollResponse.json();
          
          if (pollData.evaluation) {
            evaluationData = pollData;
            break;
          }
          // Continue polling if still processing
        }
        
        if (!evaluationData) {
          throw new Error("Evaluation timed out. Please try again.");
        }
        
        const score = evaluationData.score || 0;
        const feedbackMessage = evaluationData.feedback || "No feedback provided.";
  
        setEvaluationScore(score);
        setFeedback(feedbackMessage);
  
        setFloatingScoreValue(score);
        setShowFloatingScore(true);
        setTimeout(() => setShowFloatingScore(false), 3000);
  
        if (user) {
          // Store submission under the current question
          await storeSubmission(user.uid, questionText, pseudocode, score, feedbackMessage);
          
          // Update question stats if this is the best score
          await updateQuestionStats(currentQuestionId, score);
          
          if (score >= 7) {
            await updateQuestionStatus("completed");
            await updateUserStats(user.uid, score);
            await fetchUserStats(user.uid);
          }
        }
        
        if (score >= 7) {
          setGenerateButtonEnabled(true);
  
          if (editorCardRef.current) {
            editorCardRef.current.clearEditor();
          }
          
          triggerConfetti();
          document.body.classList.add("success-animation");
          setTimeout(() => document.body.classList.remove("success-animation"), 3000);
        } else {
          setGenerateButtonEnabled(false);
          document.body.classList.add("failure-animation");
          setTimeout(() => document.body.classList.remove("failure-animation"), 3000);
        }
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("API Error:", error);
      setFeedback("⚠️ Error: Unable to evaluate pseudocode. Please try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const storeSubmission = async (uid, question, pseudocode, score, feedback) => {
    try {
      // Store submission in the question's submissions subcollection
      const submissionRef = doc(collection(db, `users/${uid}/user_questions/${currentQuestionId}/submissions`));
      
      await setDoc(submissionRef, {
        question,
        pseudocode,
        score,
        feedback,
        difficulty: selectedDifficulty,
        topics: getSelectedTopicsArray(),
        timestamp: serverTimestamp(),
        status: score >= 7 ? 'accepted' : 'rejected'
      });
      
      // Also store a reference in the main submissions collection for easy querying
      const mainSubmissionRef = doc(collection(db, `users/${uid}/submissions`));
      await setDoc(mainSubmissionRef, {
        questionId: currentQuestionId,
        submissionId: submissionRef.id,
        score,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error storing submission:", error);
    }
  };

  const updateQuestionStats = async (questionId, score) => {
    try {
      const questionRef = doc(db, `users/${user.uid}/user_questions`, questionId);
      const questionSnap = await getDoc(questionRef);
      
      if (questionSnap.exists()) {
        const questionData = questionSnap.data();
        const currentBest = questionData.bestScore || 0;
        const submissionCount = questionData.submissionCount || 0;
        
        const updateData = {
          submissionCount: increment(1)
        };
        
        if (score > currentBest) {
          updateData.bestScore = score;
        }
        
        await updateDoc(questionRef, updateData);
      }
    } catch (error) {
      console.error("Error updating question stats:", error);
    }
  };

  const handleNextQuestion = () => {
    setShowDialog(false);
    setFeedback("");
    
    if (evaluationScore >= 7) {
      if (editorCardRef.current) {
        editorCardRef.current.clearEditor();
      }
      
      generateQuestion();
      setIsQuestionGenerated(false);
      setGenerateButtonEnabled(true);
      setQuestionText("");
      setCurrentQuestionId(null);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    
    if (evaluationScore >= 7) {
      setIsQuestionGenerated(false);
      setGenerateButtonEnabled(true);
      setQuestionText("");
      setCurrentQuestionId(null);
      // Reset title to challenge number format
      setQuestionTitle(`Challenge ${totalQuestionsGenerated} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`);
      
      if (editorCardRef.current) {
        editorCardRef.current.clearEditor();
      }
    }
  };

  const handleTopicChange = (topic) => {
    const newTopics = {
      ...selectedTopics,
      [topic]: !selectedTopics[topic]
    };
    
    setSelectedTopics(newTopics);
    localStorage.setItem("selectedTopics", JSON.stringify(newTopics));
  };

  const handleDifficultyChange = (difficulty) => {
    setSelectedDifficulty(difficulty);
    localStorage.setItem("selectedDifficulty", difficulty);
  };

  const renderers = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={atomDark}
          language={match[1]}
          PreTag="div"
          customStyle={{
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            margin: '1rem 0'
          }}
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  };

  const MarkdownQuestion = ({ text }) => {
    return (
      <div className="markdown-content">
        <ReactMarkdown components={renderers}>
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  const ProgressStep = ({ currentStep, totalSteps }) => {
    return (
      <div className="progress-steps">
        {[...Array(totalSteps)].map((_, index) => (
          <div 
            key={index} 
            className={`step ${index+1 <= currentStep ? 'active' : ''}`}
          />
        ))}
      </div>
    );
  };

  const FloatingScore = ({ score }) => {
    const scoreColor = score >= 7 ? '#20E700' : '#ff4444';
    
    return (
      <motion.div 
        className="floating-score"
        initial={{ opacity: 0, y: 0, scale: 0.5 }}
        animate={{ 
          opacity: [0, 1, 1, 0], 
          y: -100, 
          scale: [0.5, 1.5, 1.5, 0.8] 
        }}
        transition={{ duration: 3, times: [0, 0.2, 0.8, 1] }}
        style={{ color: scoreColor }}
      >
        +{score}
      </motion.div>
    );
  };

  const hasContent = questionText && questionText.trim().length > 0;

  const loadingAnimationOptions = {
    loop: true,
    play: true,
    animationData: loadingAnimation,
    style: { width: 200, height: 200 }
  };

  const successAnimationOptions = {
    loop: false,
    play: true,
    animationData: successAnimation,
    style: { width: 150, height: 150 }
  };

  const errorAnimationOptions = {
    loop: false,
    play: true,
    animationData: errorAnimation,
    style: { width: 150, height: 150 }
  };

  return (
    <div className="container py-5">
      <canvas ref={confettiCanvasRef} className="confetti-canvas"></canvas>
      
      {showFloatingScore && <FloatingScore score={floatingScoreValue} />}
      
      <ImportanceSection />
      
      {currentStep > 0 && (
        <div className="progress-container">
          <p className="generating-text">Generating your challenge...</p>
          <ProgressStep currentStep={currentStep} totalSteps={totalSteps} />
        </div>
      )}
      
{/* Question Settings Section */}
<div className="settings-container mb-4 p-4 border rounded">
  <h4>Question Settings</h4>
  
  <div className="mb-3">
    <label htmlFor="difficulty" className="form-label">Difficulty Level:</label>
    <select 
      id="difficulty" 
      className="form-select" 
      value={selectedDifficulty}
      onChange={(e) => handleDifficultyChange(e.target.value)}
      disabled={isGeneratingQuestion || !!questionText} // Disabled when generating or question exists
    >
      <option value="easy">Easy</option>
      <option value="medium">Medium</option>
      <option value="hard">Hard</option>
    </select>
  </div>
  
  <div className="mb-3">
    <label className="form-label">Select Topics:</label>
    <div className="topic-checkboxes row">
      {Object.keys(selectedTopics).map((topic) => (
        <div className="col-md-4 mb-2" key={topic}>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id={`topic-${topic}`}
              checked={selectedTopics[topic]}
              onChange={() => handleTopicChange(topic)}
              disabled={isGeneratingQuestion || !!questionText} // Disabled when generating or question exists
            />
            <label className="form-check-label" htmlFor={`topic-${topic}`}>
              {topic.charAt(0).toUpperCase() + topic.slice(1).replace(/([A-Z])/g, ' $1')}
            </label>
          </div>
        </div>
      ))}
    </div>
    {getSelectedTopicsArray().length === 0 && !questionText && (
      <div className="text-danger">Please select at least one topic</div>
    )}
  </div>
</div>

{/* Buttons Section */}
<div className="text-center mb-4">
  <div className="d-flex flex-column flex-md-row justify-content-center align-items-center gap-3">
    <button 
      className="btn btn-primary btn-lg"
      onClick={generateQuestion}
      disabled={
        isGeneratingQuestion || 
        !!questionText || // Disable if question exists
        getSelectedTopicsArray().length === 0 // Disable if no topics selected
      }
    >
      {isGeneratingQuestion ? 'Generating...' : 'Generate New Question'}
    </button>
    
    <button 
      className="btn btn-secondary btn-lg ms-2"
      onClick={handleSkipQuestion}
      disabled={isGeneratingQuestion || !questionText} // Only enable if question exists
    >
      Skip Question
    </button>
    
    {questionText && !generateButtonEnabled && !isGeneratingQuestion && (
      <p className="text-muted mt-2">
        <small>Complete this challenge with a score of 7+ to unlock the next question.</small>
      </p>
    )}
  </div>
</div>
      <div className="question-card-container">
        <QuestionCard
          questionTitle={questionTitle || `Challenge ${totalQuestionsGenerated} - ${selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1)}`}
          questionText={isGeneratingQuestion ? 
            <div className="loading-container">
              <Lottie
                {...loadingAnimationOptions}
              />
              <p>Preparing your problem...</p>
            </div> : 
            hasContent ? 
              <MarkdownQuestion text={questionText} /> : 
              <p>No question available. Select topics and difficulty, then click "Generate New Question" to get started.</p>
          }
          isLoading={isGeneratingQuestion}
        />
      </div>

      <div className="editor-card-container">
        <EditorCard 
          ref={editorCardRef}
          onSubmit={evaluatePseudocode} 
          isLoading={isEvaluating} 
          feedback={feedback}
          isQuestionGenerated={isQuestionGenerated}
        />
      </div>

      <AnimatePresence>
        {showDialog && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ 
              type: "spring", 
              stiffness: 500, 
              damping: 30,
              duration: 0.5 
            }}
            className="dialog-overlay"
          >
            <EvaluationDialog
              score={evaluationScore}
              feedback={feedback}
              isEvaluating={isEvaluating}
              onClose={handleCloseDialog}
              onNextQuestion={handleNextQuestion}
              animation={evaluationScore >= 7 ? 
                <Lottie {...successAnimationOptions} /> : 
                <Lottie {...errorAnimationOptions} />
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
};

export default HomePage;