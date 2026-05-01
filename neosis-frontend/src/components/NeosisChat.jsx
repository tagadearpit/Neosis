import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageSquare, AlertCircle, ArrowLeft } from 'lucide-react';

// ---> THIS IS THE NEW LINE <---
// This tells Axios to ALWAYS send cookies (like your Google Auth session) cross-domain
axios.defaults.withCredentials = true;

export default function NeosisChat() {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStartChat = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Uses your system environment variable
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

    try {
      // Call your Spring Boot backend to verify the recipient exists
      // Because we set withCredentials = true above, this will now include your session cookie!
      await axios.get(`${backendUrl}/api/users/check?email=${emailInput}`);
      setActiveChat(emailInput);
      setEmailInput('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Sender does not exist'); // Exact error message requested
      } else {
        setError('Network error. Is the backend running?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="p-6 bg-blue-600 text-white shadow-md z-10 relative">
          <h1 className="text-2xl font-bold tracking-wider">NEOSIS</h1>
          <p className="text-blue-100 text-sm mt-1">Professional Communication</p>
        </div>

        {/* Dynamic Content Area */}
        <div className="p-6 bg-white min-h-[300px] flex flex-col justify-center">
          {!activeChat ? (
            <motion.form 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleStartChat} 
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 outline-none"
                  placeholder="Enter email to start chatting..."
                />
              </div>

              {/* Smooth Error Animation */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100"
                  >
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-3 rounded-xl transition-all duration-200 flex justify-center items-center gap-2 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Checking...
                  </span>
                ) : (
                  <>
                    <MessageSquare size={18} />
                    Start Conversation
                  </>
                )}
              </button>
            </motion.form>
          ) : (
            // Chat Window Interface
            <motion.div
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', bounce: 0.1, duration: 0.5 }}
              className="flex flex-col h-full"
            >
              <button 
                onClick={() => setActiveChat(null)}
                className="text-sm text-gray-500 mb-4 hover:text-blue-600 transition-colors flex items-center gap-1 w-fit"
              >
                <ArrowLeft size={16} /> Back
              </button>
              
              <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400 p-6 text-center bg-gray-50">
                <MessageSquare size={32} className="mb-3 text-gray-300" />
                <p>Chat interface with</p>
                <p className="font-medium text-gray-600 mt-1">{activeChat}</p>
                <p className="text-xs mt-4">WebSocket connection will go here</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
