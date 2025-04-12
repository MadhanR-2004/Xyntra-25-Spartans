import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom"; 
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min";
import NavBar from "./components/NavBar";
import HomePage from './homePage';
import LandingPage from './landingPage';
import { auth, signInWithGoogle, logout, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  limit
} from "firebase/firestore";
import "./App.css";

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const confettiCanvasRef = useRef(null);

  // State management
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState({
    totalScore: 0,
    questionsSolved: 0,
    dailyQuestions: 0,
    streak: 0,
    lastActive: "",
  });
  const [totalQuestionsGenerated, setTotalQuestionsGenerated] = useState(1);
  const [userQuestions, setUserQuestions] = useState([]);
  const [currentQuestionId, setCurrentQuestionId] = useState(null);
  const [questionText, setQuestionText] = useState("");
  const [questionTitle, setQuestionTitle] = useState("");

  // Authentication state handling
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Clear local storage on auth change
      localStorage.removeItem('selectedDifficulty');
      localStorage.removeItem('selectedTopics');
      
      setUser(user);
      
      if (user) {
        await fetchUserQuestions(user.uid);
        await fetchUserStats(user.uid);
      } else {
        // Reset states when user logs out
        setTotalQuestionsGenerated(1);
        setUserQuestions([]);
        setQuestionText("");
        setQuestionTitle("");
        setCurrentQuestionId(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch user's questions from Firestore
  const fetchUserQuestions = async (uid) => {
    try {
      const userQuestionsRef = collection(db, `users/${uid}/user_questions`);
      const q = query(
        userQuestionsRef, 
        where("status", "==", "in-progress"),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const latestQuestionDoc = querySnapshot.docs[0];
        const questionData = latestQuestionDoc.data();
        
        setQuestionText(questionData.question);
        setQuestionTitle(questionData.title || `Challenge ${questionData.totalQuestions || 1}`);
        setTotalQuestionsGenerated(questionData.totalQuestions || 1);
        setCurrentQuestionId(latestQuestionDoc.id);
        
        // Update user questions list
        setUserQuestions(prev => [
          ...prev.filter(q => q.status !== "in-progress"),
          {
            id: latestQuestionDoc.id,
            ...questionData,
            status: "in-progress"
          }
        ]);
      }
    } catch (error) {
      console.error("Error fetching user questions:", error);
    }
  };

  // Fetch user stats
  const fetchUserStats = async (uid) => {
    try {
      const userRef = doc(db, "users", uid);
      const statsRef = doc(db, `users/${uid}/stats/current`);
      const statsSnap = await getDoc(statsRef);

      if (!statsSnap.exists()) {
        const initialStats = {
          totalScore: 0,
          questionsSolved: 0,
          dailyQuestions: 0,
          streak: 0,
          lastActive: new Date().toISOString(),
          totalQuestions: 1
        };
        
        await setDoc(statsRef, initialStats);
        setUserStats(initialStats);
        
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
          });
        }
      } else {
        const statsData = statsSnap.data();
        setUserStats(statsData);
        if (statsData.totalQuestions) {
          setTotalQuestionsGenerated(statsData.totalQuestions);
        }
      }
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  return (
    <div className="app-container">
      <NavBar 
        user={user} 
        userStats={userStats} 
        signInWithGoogle={signInWithGoogle} 
        logout={logout} 
      />
      <canvas ref={confettiCanvasRef} className="confetti-canvas"></canvas>
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/home" element={
          <HomePage 
            user={user} 
            userStats={userStats}
            setUserStats={setUserStats}
            navigate={navigate}
            totalQuestionsGenerated={totalQuestionsGenerated}
            setTotalQuestionsGenerated={setTotalQuestionsGenerated}
            userQuestions={userQuestions}
            setUserQuestions={setUserQuestions}
            currentQuestionId={currentQuestionId}
            setCurrentQuestionId={setCurrentQuestionId}
            questionText={questionText}
            setQuestionText={setQuestionText}
            questionTitle={questionTitle}
            setQuestionTitle={setQuestionTitle}
            fetchUserStats={fetchUserStats}
            fetchUserQuestions={fetchUserQuestions}
          />
        } />
      </Routes>
    </div>
  );
};

export default App;