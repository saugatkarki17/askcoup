// frontend/src/context/AuthContext.js
import React, { useContext, useState, useEffect } from 'react';
import { auth } from '../firebase/firebase'; // Ensure correct path to your firebase.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';

const AuthContext = React.createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true); // State to indicate if auth state is loading

  // Firebase Authentication functions
  const signup = (email, password) => {
    // You can add additional user data like 'isProfessor' here or in a separate database after creation
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = () => {
    return signOut(auth);
  };

  // Subscribe to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // Set currentUser to the authenticated user object or null
      setLoading(false); // Auth state has been loaded
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []); // Empty dependency array means this runs once on mount

  // Value provided by the context
  const value = {
    currentUser, // The current logged-in user object (or null)
    signup,      // Function to sign up a new user
    login,       // Function to log in an existing user
    logout,      // Function to log out the current user
  };

  return (
    // Only render children when authentication state has been loaded
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}