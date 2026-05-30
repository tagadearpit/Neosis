import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageSquare, UserPlus, Bell, Send, Check, ArrowLeft, Moon, Sun, Loader2 } from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

axios.defaults.withCredentials = true;

// ISSUE FIX 11: Moved backendUrl outside the component so it isn't recreated on every render
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// ISSUE FIX 4: Secure HTML Entity Decoding using DOMParser (Immune to XSS)
const decodeHTMLEntities = (text) => {
  if (!text) return text;
  const doc = new DOMParser().parseFromString(text, "text/html");
  return doc.documentElement.textContent;
};

const formatName = (email) => {
  if (!email) return '';
  const namePart = email.split('@')[0];
  return namePart
    .split(/[\.\-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function NeosisChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [addEmailInput, setAddEmailInput] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  // ISSUE FIX 14: Added loading state for switching chats
  const [isChatLoading, setIsChatLoading] = useState(false);
  // ISSUE FIX 13: Replaced alert() with a custom Toast state
  const [toast, setToast] = useState(null);

  const typingTimeoutRef = useRef(null);
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); 
  
  const activeChatRef = useRef(activeChat);
  // ISSUE FIX 3: Ref for currentUser to prevent stale closures in setTimeout
  const currentUserRef = useRef(currentUser);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // ISSUE FIX 12: Wrapped in useCallback to safely use inside useEffect
  const fetchSidebarData = useCallback(async () => {
    try {
      const friendsRes = await axios.get(`${BACKEND_URL}/api/contacts/friends`);
      const pendingRes = await axios.get(`${BACKEND_URL}/api/contacts/pending`);
      setFriends(friendsRes.data);
      setPendingRequests(pendingRes.data);
    } catch (err) {
      console.error("Failed to load sidebar data", err);
    }
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const userRes = await axios.get(`${BACKEND_URL}/api/users/me`);
        setCurrentUser(userRes.data);
        connectWebSocket(userRes.data.email);
        fetchSidebarData();
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    
    initializeApp();

    // ISSUE FIX 1 & 2: Critical WebSocket and Timer Cleanup on Unmount
    return () => {
      if (stompClientRef.current) {
        stompClientRef.current.deactivate();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [fetchSidebarData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRemoteTyping]);

  const connectWebSocket = (userEmail) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`),
      onConnect: () => {
        client.subscribe(`/queue/messages/${userEmail}`, (message) => {
          const incomingMessage = JSON.parse(message.body);
          
          if (incomingMessage.senderEmail === activeChatRef.current) {
            // ISSUE FIX 7: Deduplicate messages to prevent double-rendering if WebSocket echoes
            setMessages((prev) => {
              const isDuplicate = prev.some(m => m.timestamp === incomingMessage.timestamp && m.content === incomingMessage.content);
              return isDuplicate ? prev : [...prev, incomingMessage];
            });
          } else if (incomingMessage.senderEmail !== currentUserRef.current?.email) {
            setUnreadCounts((prev) => ({
              ...prev,
              [incomingMessage.senderEmail]: (prev[incomingMessage.senderEmail] || 0) + 1
            }));
          }
          setIsRemoteTyping(false);
        });
        
        client.subscribe(`/queue/typing/${userEmail}`, (message) => {
          const data = JSON.parse(message.body);
          if (data.senderEmail === activeChatRef.current) {
            setIsRemoteTyping(data.isTyping === 'true');
          }
        });
      },
    });
    client.activate();
    stompClientRef.current = client; 
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    // ISSUE FIX 6: Basic Email Input Validation
    if (!addEmailInput || !/\S+@\S+\.\S+/.test(addEmailInput)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    
    try {
      // ISSUE FIX 5: Sent data securely in HTTP Body (Form-Data) instead of URL Query string
      await axios.post(`${BACKEND_URL}/api/contacts/request`, new URLSearchParams({ receiverEmail: addEmailInput }));
      setAddEmailInput('');
      showToast("Friend request sent!");
    } catch (err) {
      showToast("Failed to send request. Make sure the email is correct.", "error");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      // ISSUE FIX 5: Sent data securely in HTTP Body
      await axios.post(`${BACKEND_URL}/api/contacts/accept`, new URLSearchParams({ requestId: requestId }));
      fetchSidebarData(); 
      setShowNotifications(false); 
      showToast("Friend request accepted!");
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  const openChat = async (friendEmail) => {
    setActiveChat(friendEmail);
    // ISSUE FIX 8: Clear immediately to prevent UI flash of old conversation
    setMessages([]);
    setUnreadCounts(prev => ({ ...prev, [friendEmail]: 0 }));
    setIsChatLoading(true);
    
    try {
      const historyRes = await axios.get(`${BACKEND_URL}/api/messages/history/${friendEmail}`);
      setMessages(historyRes.data);
    } catch (err) {
      console.error("Failed to load history", err);
      showToast("Failed to load chat history.", "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (newMessage.trim() === '' || !stompClientRef.current) return;
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uniqueId = Date.now().toString(); // Helps with React keys and deduplication
    
    const chatMessage = {
      id: uniqueId,
      senderEmail: currentUser.email,
      recipientEmail: activeChat,
      content: newMessage.trim(),
      timestamp: timeString 
    };
    
    stompClientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(chatMessage) });
    setMessages((prev) => [...prev, chatMessage]);
    setNewMessage('');
    sendTypingStatus(false);
  };

  const sendTypingStatus = (isTyping) => {
    // ISSUE FIX 3: Guard clause against stale or uninitialized state
    if (!stompClientRef.current || !activeChatRef.current || !currentUserRef.current) return;
    
    stompClientRef.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ senderEmail: currentUserRef.current.email, recipientEmail: activeChatRef.current, isTyping: isTyping.toString() })
    });
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    sendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 1500);
  };

  // Skeleton Loading Screen
  if (!currentUser) {
    return (
      <div className="flex h-screen bg-slate-100 dark:bg-gray-950 p-4 relative transition-colors duration-300">
        <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex h-full animate-pulse transition-colors duration-300">
          <div className="w-full md:w-1/3 bg-slate-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="h-[76px] bg-blue-200/50 dark:bg-blue-900/30 w-full"></div>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-full w-full"></div>
            </div>
            <div className="flex-1 p-2 space-y-2 mt-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full flex-shrink-0"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden md:flex w-2/3 flex-col bg-white dark:bg-gray-900">
            <div className="h-[76px] border-b border-gray-100 dark:border-gray-800 flex items-center px-6 gap-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
              <div className="space-y-2.5">
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-32"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded w-20"></div>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-6">
              <div className="flex justify-end"><div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-tr-sm w-1/3"></div></div>
              <div className="flex justify-start"><div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-2xl rounded-tl-sm w-1/4"></div></div>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <div className="flex-1 h-[52px] bg-gray-100 dark:bg-gray-800 rounded-full"></div>
              <div className="w-[52px] h-[52px] bg-gray-200 dark:bg-gray-800 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-gray-950 p-4 relative transition-colors duration-300">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className={`absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-bold shadow-xl flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}
          >
            {toast.type === 'success' && <Check size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-6xl mx-auto bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex h-full transition-colors duration-300">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 bg-slate-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col transition-colors duration-300`}>
          <div className="p-5 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex justify-between items-center z-20">
            <div>
              <h2 className="text-xl font-bold tracking-wide">NEOSIS</h2>
              <p className="text-xs text-blue-200 mt-1">{currentUser.name || formatName(currentUser.email)}</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsDarkMode(!isDarkMode)} 
                className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition relative"
                >
                  <Bell size={20} />
                  {pendingRequests.length > 0 && (
                    <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-blue-800 animate-pulse"></span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: 10 }} 
                      className="absolute top-12 right-0 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 text-gray-800 dark:text-white overflow-hidden"
                    >
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 border-b dark:border-gray-600 text-sm font-bold flex justify-between items-center">
                        <span>Friend Requests</span>
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs px-2 py-1 rounded-full">{pendingRequests.length}</span>
                      </div>
                      {pendingRequests.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500 dark:text-gray-400 text-center">No pending requests</div>
                      ) : (
                        pendingRequests.map(req => (
                          <div key={req.id} className="p-3 border-b dark:border-gray-700 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                            <span className="text-sm truncate w-2/3" title={req.senderEmail}>{formatName(req.senderEmail)}</span>
                            <button 
                              onClick={() => handleAcceptRequest(req.id)} 
                              className="bg-green-500 text-white p-1.5 rounded-full hover:bg-green-600 transition shadow-sm"
                            >
                              <Check size={16}/>
                            </button>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <form onSubmit={handleSendRequest} className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex gap-2 transition-colors duration-300">
            <input 
              type="email" 
              value={addEmailInput} 
              onChange={(e) => setAddEmailInput(e.target.value)} 
              placeholder="Add contact by email..." 
              className="flex-1 bg-gray-100 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" 
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition">
              <UserPlus size={18}/>
            </button>
          </form>

          <div className="flex-1 overflow-y-auto">
            {friends.map(friend => (
              <div 
                key={friend} 
                onClick={() => openChat(friend)} 
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors flex items-center gap-3 ${activeChat === friend ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-lg">
                  {formatName(friend).charAt(0).toUpperCase()}
                </div>
                <div className="font-semibold text-sm text-gray-800 dark:text-gray-100 truncate flex-1">{formatName(friend)}</div>
                
                {unreadCounts[friend] > 0 && (
                  <div className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-bounce-short">
                    {unreadCounts[friend]}
                  </div>
                )}
              </div>
            ))}
            {friends.length === 0 && (
              <div className="p-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 text-center h-full">
                <UserPlus size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No chats yet.</p>
                <p className="text-xs mt-1">Send a request to start talking!</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR (Main Chat) ================= */}
        <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-white dark:bg-gray-900 transition-colors duration-300`}>
          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500">
              <MessageSquare size={64} className="mb-4 text-gray-300 dark:text-gray-600" />
              <h2 className="text-xl font-medium text-gray-600 dark:text-gray-300">Neosis for Web</h2>
              <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">Select a contact from the sidebar to start a secure, end-to-end encrypted conversation.</p>
            </div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-4 shadow-sm z-10 transition-colors duration-300">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="md:hidden text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-gray-800 transition"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-lg shadow-inner">
                  {formatName(activeChat).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-800 dark:text-gray-100">{formatName(activeChat)}</div>
                  <div className="text-[11px] font-medium flex items-center gap-1 mt-0.5">
                    {isRemoteTyping ? (
                      <span className="text-blue-500 italic animate-pulse">typing...</span>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        <span className="text-green-500">Securely Connected</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-gray-950 space-y-4" style={{ backgroundImage: 'radial-gradient(var(--tw-gradient-stops))' }}>
                {isChatLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((msg, index) => {
                      const isMe = msg.senderEmail === currentUser.email;
                      // ISSUE FIX 10: Use unique keys instead of pure array index
                      return (
                        <motion.div key={msg.id || `${index}-${msg.timestamp}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-5 py-3 text-[15px] shadow-sm leading-relaxed break-words ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm'}`}>
                              {decodeHTMLEntities(msg.content)}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium px-1">{msg.timestamp || 'Just now'}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {isRemoteTyping && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex justify-start">
                          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm flex items-center gap-1 w-16">
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
                          </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} className="h-2" />
              </div>

              {/* ISSUE FIX 15: Removed redundant onKeyDown, as standard HTML <form> onSubmit handles the 'Enter' key natively */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex gap-3 transition-colors duration-300">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={handleInputChange} 
                  placeholder="Type a message..." 
                  className="flex-1 px-5 py-3.5 bg-slate-100 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400 border-transparent rounded-full focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-inner" 
                />
                <button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="bg-blue-600 hover:bg-blue-700 text-white p-3.5 rounded-full shadow-lg disabled:opacity-50 disabled:shadow-none transition"
                >
                  <Send size={18} className="ml-1" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}cd 