import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Ensure this path is correct based on your project structure
import { useNavigate } from 'react-router-dom';

/**
 * AuthPage Component
 * Handles user authentication (Sign In and Sign Up)
 * Uses context for authentication logic and react-router-dom for navigation.
 * Styles are applied using Tailwind CSS classes.
 */
export default function AuthPage() {
  // State to manage the current mode: 'signin' or 'signup'
  const [mode, setMode] = useState('signin');
  // State for email input
  const [email, setEmail] = useState('');
  // State for password input
  const [password, setPassword] = useState('');
  // State for displaying authentication errors
  const [error, setError] = useState('');
  // State to determine if the user is signing up as a Professor (assuming role handling happens post-signup)
  const [isProfessor, setIsProfessor] = useState(false);

  // Get authentication functions (signup, login) from the AuthContext
  const { signup, login } = useAuth();
  // Hook for programmatic navigation
  const navigate = useNavigate();

  /**
   * Handles the form submission for both sign in and sign up.
   * Prevents default form submission and calls the appropriate auth context function.
   * Navigates to the home page ('/') on success or sets an error message on failure.
   * @param {object} e - The form submission event object.
   */
  const handleSubmit = async e => {
    e.preventDefault(); // Prevent default form reload
    setError(''); // Clear any previous errors

    try {
      if (mode === 'signup') {
        // Call signup function from AuthContext with email and password
        await signup(email, password);
        // Note: Role (isProfessor) handling might need to be done here or in the AuthContext
        // after the user is successfully created in your authentication system (e.g., Firebase).
        // You would typically save the user's role to a database linked to their user ID.
      } else {
        // Call login function from AuthContext with email and password
        await login(email, password);
      }
      // Navigate to the home page after successful authentication
      navigate('/');
    } catch (err) {
      // Catch errors from the authentication process (e.g., Firebase errors)
      // Display the error message to the user
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4"> {/* Container for centering the form */}
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-6"> {/* Card-like container for the form */}

        {/* Welcome Header */}
        <h2 className="text-center text-2xl font-semibold mb-2">Welcome</h2>
        {/* Subtitle */}
        <p className="text-center text-sm text-gray-500 mb-6">
          Sign in to your account or create a new one
        </p>

        {/* Tabs for switching between Sign In and Sign Up modes */}
        <div className="flex mb-6 bg-gray-100 rounded">
          {/* Sign In Button */}
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 text-center rounded-l ${mode === 'signin' ? 'bg-white font-medium' : 'text-gray-500'}`}
          >
            Sign In
          </button>
          {/* Sign Up Button */}
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-center rounded-r ${mode === 'signup' ? 'bg-white font-medium' : 'text-gray-500'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display error message if there is one */}
          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Email Input Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">Email</label>
            <input
              id="email"
              type="email"
              placeholder="your.email@university.edu"
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-300"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required // Make email field required
            />
          </div>

          {/* Password Input Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-300"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required // Make password field required
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="mt-4 w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition"
          >
            {mode === 'signin' ? 'Sign In' : 'Create Account'} {/* Button text changes based on mode */}
          </button>
        </form>

        {/* Footer Text */}
        <p className="mt-6 text-center text-xs text-gray-400">
          CougAI ·
        </p>
      </div>
    </div>
  );
}
