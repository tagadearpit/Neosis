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
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  // NEW: Typing Indicator States
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); 

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

  // Scroll to bottom when new messages arrive OR when someone starts typing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRemoteTyping]);

  const connectWebSocket = (userEmail) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${backendUrl}/ws`),
      onConnect: () => {
        client.subscribe(`/topic/notifications/${userEmail}`, (message) => {
          const notificationData = JSON.parse(message.body);
          showNotification(notificationData);
        });

        client.subscribe(`/queue/messages/${userEmail}`, (message) => {
          const incomingMessage = JSON.parse(message.body);
          setMessages((prevMessages) => [...prevMessages, incomingMessage]);
          // If they sent a message, they definitely stopped typing
          setIsRemoteTyping(false);
        });

        // NEW: Listen for incoming typing indicators
        client.subscribe(`/queue/typing/${userEmail}`, (message) => {
          const data = JSON.parse(message.body);
          if (data.senderEmail === activeChat) {
             setIsRemoteTyping(data.isTyping === 'true');
          }
        });
      },
    });

    client.activate();
    stompClientRef.current = client; 
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
      setMessages([]); 
      setEmailInput('');
      setIsRemoteTyping(false); // Reset typing status on new chat
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

  // NEW: Broadcast typing status to the server
  const sendTypingStatus = (isTyping) => {
    if (stompClientRef.current && activeChat) {
      stompClientRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({
          senderEmail: currentUser.email,
          recipientEmail: activeChat,
          isTyping: isTyping.toString()
        })
      });
    }
  };

  // NEW: Handle input changes with a debounce to prevent spamming the server
  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    sendTypingStatus(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    // If user stops typing for 1.5 seconds, send "is typing = false"
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !stompClientRef.current) return;

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const chatMessage = {
      senderEmail: currentUser.email,
      recipientEmail: activeChat,
      content: newMessage.trim(),
      timestamp: timeString 
    };

    stompClientRef.current.publish({
      destination: '/app/chat.send',
      body: JSON.stringify(chatMessage)
    });

    setMessages((prev) => [...prev, chatMessage]);
    setNewMessage('');
    
    // Stop the typing indicator immediately when sending
    sendTypingStatus(false);
  };

  return (
    <div className="flex h-screen bg-slate-100 items-center justify-center p-4 relative overflow-hidden">
      
      {/* Floating Notifications */}
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

      {/* Main Chat App Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 h-[650px] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md z-10 relative flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-wider">NEOSIS</h1>
            <p className="text-blue-200 text-xs mt-1 font-medium tracking-wide">SECURE CHAT</p>
          </div>
          {currentUser && (
            <div className="text-xs bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full font-medium shadow-sm">
              {currentUser.name}
            </div>
          )}
        </div>

        <div className="flex-1 bg-white overflow-hidden flex flex-col">
          {!activeChat ? (
            <div className="p-8 flex flex-col justify-center h-full bg-slate-50">
                <form onSubmit={handleStartChat} className="space-y-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Start a Conversation
                    </label>
                    <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white shadow-sm focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 outline-none"
                    placeholder="Enter recipient's email..."
                    />
                </div>

                <AnimatePresence>
                  {error && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-600 text-sm flex items-center gap-2 bg-red-50 p-4 rounded-2xl border border-red-100"
                      >
                      <AlertCircle size={18} />
                      <span className="font-medium">{error}</span>
                      </motion.div>
                  )}
                </AnimatePresence>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-lg hover:shadow-blue-600/30 transition-all duration-200 disabled:opacity-70 disabled:active:scale-100"
                >
                    <MessageSquare size={20} />
                    {isLoading ? 'Verifying...' : 'Connect Securely'}
                </button>
                </form>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-gray-100 bg-white flex items-center gap-3 shadow-sm z-10">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <div className="font-bold text-gray-800 text-sm truncate">{activeChat}</div>
                  
                  {/* Dynamic Subtitle (Typing indicator OR Secure Connection) */}
                  <div className="text-[10px] font-medium flex items-center gap-1 mt-0.5">
                    {isRemoteTyping ? (
                       <span className="text-blue-500 font-bold italic animate-pulse">typing...</span>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-green-500">Encrypted Connection</span>
                      </>
                    )}
                  </div>

                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 p-5 overflow-y-auto bg-slate-50 space-y-4" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <AnimatePresence>
                  {messages.map((msg, index) => {
                    const isMe = msg.senderEmail === currentUser.email;
                    return (
                      <motion.div 
                        key={index} 
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div 
                            className={`px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                              isMe 
                                ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                                : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                            }`}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 font-medium px-1">
                            {msg.timestamp || 'Just now'}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Animated Bouncing Dots Typing Bubble */}
                  {isRemoteTyping && (
                     <motion.div 
                       initial={{ opacity: 0, y: 10, scale: 0.9 }} 
                       animate={{ opacity: 1, y: 0, scale: 1 }} 
                       exit={{ opacity: 0, scale: 0.9 }} 
                       className="flex justify-start"
                     >
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1 w-16">
                           <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                           <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                           <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-gray-400 rounded-full" />
                        </div>
                     </motion.div>
                  )}
                </AnimatePresence>
                <div ref={messagesEndRef} className="h-2" />
              </div>

              {/* Message Input - Updated to use handleInputChange */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-3 items-center">
                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange} 
                  placeholder="Type a secure message..."
                  className="flex-1 px-5 py-3.5 bg-slate-100 border-transparent rounded-full focus:bg-white focus:ring-4 focus:ring-blue-500/20 outline-none text-sm transition-all shadow-inner"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full flex items-center justify-center shadow-lg hover:shadow-blue-600/40 disabled:opacity-50 disabled:shadow-none disabled:hover:bg-blue-600 transition-all duration-200"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
