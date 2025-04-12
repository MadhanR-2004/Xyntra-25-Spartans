// src/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD8PiW50cJd5JNo1CUcZRrDEWppScklMLM",
  authDomain: "pseudocode-f5931.firebaseapp.com",
  projectId: "pseudocode-f5931",
  storageBucket: "pseudocode-f5931.appspot.com",
  messagingSenderId: "159019404835",
  appId: "1:159019404835:web:65fe5f4b89771925e82b96",
  measurementId: "G-GWZ9NXRF6D"
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
