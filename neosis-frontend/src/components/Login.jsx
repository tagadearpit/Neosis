import React from 'react';
import { motion } from 'framer-motion';

export default function Login() {
  const handleGoogleLogin = () => {
    // Uses the environment variable to find your Spring Boot backend
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
    
    // Redirects the user to the Spring Boot OAuth2 endpoint
    window.location.href = `${backendUrl}/oauth2/authorization/google`;
  };

  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden text-center p-10 border border-gray-100"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl font-bold tracking-wider text-blue-600 mb-2">NEOSIS</h1>
          <p className="text-gray-500 mb-10">Sign in to connect with your team.</p>
        </motion.div>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleLogin}
          className="w-full bg-white border-2 border-gray-200 text-gray-700 font-medium py-3 rounded-xl flex justify-center items-center gap-3 hover:bg-gray-50 hover:border-blue-100 hover:shadow-md transition-all duration-200"
        >
          <img 
            src="https://www.svgrepo.com/show/475656/google-color.svg" 
            alt="Google logo" 
            className="w-6 h-6" 
          />
          Continue with Google
        </motion.button>

        <p className="mt-8 text-xs text-gray-400">
          By continuing, you agree to Neosis's Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
