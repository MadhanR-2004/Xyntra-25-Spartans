// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBeSoHZ5PoXHnGbj23CT9sZTlDYCdWoBw4",
  authDomain: "spartans-5e08a.firebaseapp.com",
  projectId: "spartans-5e08a",
  storageBucket: "spartans-5e08a.firebasestorage.app",
  messagingSenderId: "985899427886",
  appId: "1:985899427886:web:75f2b22dcf9ee6822157bf",
  measurementId: "G-RC5D8LCTHF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Function to handle Google Sign-In
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Save user data in Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        name: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        score: 0, // Default score
      });
    }

    return user;
  } catch (error) {
    console.error("Error signing in:", error);
  }
};

// Function to sign out
const logout = async () => {
  await signOut(auth);
};

export { auth, db, signInWithGoogle, logout };
