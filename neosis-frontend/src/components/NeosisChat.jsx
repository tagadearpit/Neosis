import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageSquare, AlertCircle, ArrowLeft, Bell } from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

axios.defaults.withCredentials = true;

export default function NeosisChat() {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // New States for Real-Time logic
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]); 

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  // Run once when the component loads
  useEffect(() => {
    const initializeUser = async () => {
      try {
        // 1. Ask the backend who is currently logged into this browser
        const response = await axios.get(`${backendUrl}/api/users/me`);
        setCurrentUser(response.data);
        
        // 2. Once we know who we are, open a WebSocket connection
        connectWebSocket(response.data.email);
      } catch (err) {
        console.error("Could not fetch current user info", err);
      }
    };

    initializeUser();
  }, []);

  const connectWebSocket = (userEmail) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${backendUrl}/ws`),
      onConnect: () => {
        console.log('Connected to WebSocket as', userEmail);
        
        // 3. Listen specifically to the channel associated with our email
        client.subscribe(`/topic/notifications/${userEmail}`, (message) => {
          const notificationData = JSON.parse(message.body);
          showNotification(notificationData);
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      },
    });

    client.activate();
  };

  // Triggers the pop-up UI
  const showNotification = (data) => {
    const id = new Date().getTime(); // Unique ID for the animation key
    setNotifications(prev => [...prev, { id, ...data }]);
    
    // Auto-remove the notification after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await axios.get(`${backendUrl}/api/users/check?email=${emailInput}`);
      setActiveChat(emailInput);
      setEmailInput('');
    } catch (err) {
      if (err.response && err.response.status === 404) {
        setError('Sender does not exist'); 
      } else {
        setError('Network error. Is the backend running?');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center p-4 relative overflow-hidden">
      
      {/* 🌟 NEW: Floating Notification Container (Top Right) 🌟 */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-3">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              className="bg-white border-l-4 border-blue-500 shadow-2xl rounded-r-xl p-4 w-80 flex items-start gap-4"
            >
              <div className="bg-blue-100 p-2 rounded-full text-blue-600 shrink-0 mt-1">
                <Bell size={18} />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">{notif.senderName}</h4>
                <p className="text-gray-600 text-xs mt-1 leading-relaxed">{notif.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Existing Chat Interface */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        <div className="p-6 bg-blue-600 text-white shadow-md z-10 relative flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-wider">NEOSIS</h1>
            <p className="text-blue-100 text-sm mt-1">Professional Communication</p>
          </div>
          {currentUser && (
            <div className="text-xs bg-blue-700 px-3 py-1 rounded-full border border-blue-500">
              {currentUser.name}
            </div>
          )}
        </div>

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
                <p className="text-xs mt-4">WebSocket connection active!</p>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
