// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

// A component that redirects to /auth if the user is not logged in
export default function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();

  // If still loading auth state, render nothing or a loading indicator
  if (loading) {
    return <div>Loading authentication...</div>; // You can replace with a spinner or null
  }

  // If user is not logged in, redirect to the auth page
  if (!currentUser) {
    return <Navigate to="/auth" replace />;
  }

  // If user is logged in, render the children (the protected component)
  return children;
}