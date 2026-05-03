import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageSquare, AlertCircle, ArrowLeft, Bell, Send } from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

axios.defaults.withCredentials = true;

export default function NeosisChat() {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]); 
  
  // NEW: State for chat messages
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // NEW: We use a ref to store the WebSocket client so we can access it anywhere
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); // Used to auto-scroll to the latest message

  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const response = await axios.get(`${backendUrl}/api/users/me`);
        setCurrentUser(response.data);
        connectWebSocket(response.data.email);
      } catch (err) {
        console.error("Could not fetch current user info", err);
      }
    };
    initializeUser();
  }, []);

  // NEW: Auto-scroll to bottom when a new message arrives
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectWebSocket = (userEmail) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${backendUrl}/ws`),
      onConnect: () => {
        console.log('Connected to WebSocket as', userEmail);
        
        // 1. Listen for connection notifications (like before)
        client.subscribe(`/topic/notifications/${userEmail}`, (message) => {
          const notificationData = JSON.parse(message.body);
          showNotification(notificationData);
        });

        // 2. NEW: Listen for actual chat messages on our personal queue
        client.subscribe(`/queue/messages/${userEmail}`, (message) => {
          const incomingMessage = JSON.parse(message.body);
          setMessages((prevMessages) => [...prevMessages, incomingMessage]);
        });
      },
    });

    client.activate();
    stompClientRef.current = client; // Save the client in our ref!
  };

  const showNotification = (data) => {
    const id = new Date().getTime();
    setNotifications(prev => [...prev, { id, ...data }]);
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
      setMessages([]); // Clear old messages when opening a new chat
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

  // NEW: Function to send a message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !stompClientRef.current) return;

    const chatMessage = {
      senderEmail: currentUser.email,
      recipientEmail: activeChat,
      content: newMessage.trim()
    };

    // Send it to the server
    stompClientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(chatMessage)
    });

    // Add it to our own screen immediately
    setMessages((prev) => [...prev, chatMessage]);
    setNewMessage('');
  };

  return (
    <div className="flex h-screen bg-gray-50 items-center justify-center p-4 relative overflow-hidden">
      
      {/* Notifications */}
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

      {/* Main Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 h-[600px] flex flex-col"
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

        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {!activeChat ? (
            <div className="p-6 flex flex-col justify-center h-full">
                <form onSubmit={handleStartChat} className="space-y-5">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Email
                    </label>
                    <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="Enter email to start chatting..."
                    />
                </div>

                {error && (
                    <div className="text-red-500 text-sm flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-100">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm disabled:opacity-70"
                >
                    <MessageSquare size={18} />
                    {isLoading ? 'Checking...' : 'Start Conversation'}
                </button>
                </form>
            </div>
          ) : (
            // 🌟 NEW CHAT INTERFACE 🌟
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="text-gray-500 hover:text-blue-600 p-1"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="font-medium text-gray-800 text-sm truncate">{activeChat}</div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3">
                {messages.map((msg, index) => {
                  const isMe = msg.senderEmail === currentUser.email;
                  return (
                    <div key={index} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        className={`px-4 py-2 rounded-2xl max-w-[80%] text-sm ${
                          isMe 
                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                            : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-100 border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-2 w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={16} className="ml-1" />
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
