import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, UserPlus, Bell, Send, Check, ArrowLeft, Moon, Sun, 
  Loader2, Phone, Video, Search, MoreVertical, Paperclip, Smile, Mic, ShieldCheck 
} from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

axios.defaults.withCredentials = true;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

// XSS-Safe HTML Entity Decoder
const decodeHTMLEntities = (text) => {
  if (!text) return text;
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'); 
};

// Formats email into clean names
const formatName = (email) => {
  if (!email) return '';
  const namePart = email.split('@')[0];
  return namePart
    .split(/[\.\-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Generates a beautiful gradient based on the user's name
const getAvatarGradient = (name) => {
  if (!name) return 'from-gray-400 to-gray-500';
  const gradients = [
    'from-indigo-500 to-blue-500',
    'from-emerald-400 to-teal-500',
    'from-pink-500 to-rose-500',
    'from-amber-400 to-orange-500',
    'from-violet-500 to-purple-500',
    'from-cyan-400 to-blue-600'
  ];
  const charCode = name.charCodeAt(0) || 0;
  return gradients[charCode % gradients.length];
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
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const typingTimeoutRef = useRef(null);
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); 
  
  const activeChatRef = useRef(activeChat);
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

    return () => {
      if (stompClientRef.current) stompClientRef.current.deactivate();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
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
            setMessages((prev) => {
              const isDuplicate = prev.some(m => m.id === incomingMessage.id || (m.timestamp === incomingMessage.timestamp && m.content === incomingMessage.content));
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
    if (!addEmailInput || !/\S+@\S+\.\S+/.test(addEmailInput)) {
      showToast("Please enter a valid email address.", "error");
      return;
    }
    try {
      await axios.post(`${BACKEND_URL}/api/contacts/request`, new URLSearchParams({ receiverEmail: addEmailInput }));
      setAddEmailInput('');
      showToast("Friend request sent!");
    } catch (err) {
      showToast("Failed to send request.", "error");
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
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
    setMessages([]);
    setUnreadCounts(prev => ({ ...prev, [friendEmail]: 0 }));
    setIsChatLoading(true);
    
    try {
      const historyRes = await axios.get(`${BACKEND_URL}/api/messages/history/${friendEmail}`);
      setMessages(historyRes.data);
    } catch (err) {
      showToast("Failed to load chat history.", "error");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (newMessage.trim() === '' || !stompClientRef.current) return;
    
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const uniqueId = Date.now().toString(); 
    
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
    if (!stompClientRef.current || !activeChatRef.current || !currentUserRef.current) return;
    stompClientRef.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({ 
        senderEmail: currentUserRef.current.email, 
        recipientEmail: activeChatRef.current, 
        isTyping: isTyping.toString() 
      })
    });
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    sendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 1500);
  };

  if (!currentUser) {
    return (
      <div className="flex h-screen bg-[#0f172a] items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 size={48} className="text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 p-2 md:p-4 transition-colors duration-300 font-sans">
      
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} 
            className={`absolute top-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full text-sm font-semibold shadow-2xl flex items-center gap-2 ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}
          >
            {toast.type === 'success' && <Check size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto rounded-3xl shadow-2xl overflow-hidden flex h-full border border-slate-200 dark:border-slate-800 relative z-10 bg-white dark:bg-slate-900">
        
        {/* ================= LEFT SIDEBAR (Deep Navy #0d1b2a) ================= */}
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] bg-[#0d1b2a] flex-col flex-shrink-0 z-20 shadow-xl`}>
          
          {/* Header */}
          <div className="p-6 flex justify-between items-center bg-[#0a1520]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <ShieldCheck size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-wide">NEOSIS</h2>
                <p className="text-[11px] text-indigo-300 font-medium">{currentUser.name || formatName(currentUser.email)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition">
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition">
                  <Bell size={18} />
                  {pendingRequests.length > 0 && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-[#0a1520]"></span>}
                </button>
                
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                      className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden"
                    >
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-sm font-bold flex justify-between items-center text-slate-800 dark:text-white">
                        <span>Friend Requests</span>
                        <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs px-2.5 py-1 rounded-full">{pendingRequests.length}</span>
                      </div>
                      {pendingRequests.length === 0 ? (
                        <div className="p-8 text-sm text-slate-400 text-center">No pending requests</div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto">
                          {pendingRequests.map(req => (
                            <div key={req.id} className="p-4 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate w-2/3" title={req.senderEmail}>{formatName(req.senderEmail)}</span>
                              <button onClick={() => handleAcceptRequest(req.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-full shadow-md shadow-emerald-500/20 transition">
                                <Check size={16}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Search / Add Friend Bar */}
          <div className="px-5 py-4">
            <form onSubmit={handleSendRequest} className="relative flex items-center">
              <div className="absolute left-4 text-slate-400"><Search size={16} /></div>
              <input 
                type="email" value={addEmailInput} onChange={(e) => setAddEmailInput(e.target.value)} 
                placeholder="Add contact by email..." 
                className="w-full bg-[#162536] text-white placeholder-slate-400 rounded-xl pl-11 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow border border-slate-700/50" required 
              />
              <button type="submit" className="absolute right-2 p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors">
                <UserPlus size={16}/>
              </button>
            </form>
          </div>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-4">
            {friends.map(friend => {
              const fName = formatName(friend);
              const isActive = activeChat === friend;
              return (
                <div 
                  key={friend} onClick={() => openChat(friend)} 
                  className={`p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-4 relative group ${isActive ? 'bg-[#162536]' : 'hover:bg-[#162536]/60'}`}
                >
                  {/* Left Active Indicator */}
                  {isActive && <motion.div layoutId="activeIndicator" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full" />}
                  
                  {/* Gradient Avatar */}
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(fName)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner`}>
                      {fName.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0d1b2a]"></div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <div className="font-semibold text-slate-100 truncate text-[15px]">{fName}</div>
                      <div className="text-[10px] text-slate-400">Just now</div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-slate-400 truncate">Tap to view conversation...</div>
                      {unreadCounts[friend] > 0 && (
                        <div className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-indigo-500/30">
                          {unreadCounts[friend]}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            
            {friends.length === 0 && (
              <div className="mt-10 flex flex-col items-center justify-center text-slate-500 text-center px-6">
                <div className="w-16 h-16 bg-[#162536] rounded-full flex items-center justify-center mb-4">
                  <UserPlus size={24} className="text-slate-400" />
                </div>
                <h3 className="text-slate-200 font-semibold mb-1">No chats yet</h3>
                <p className="text-xs leading-relaxed">Search for a friend's email above to start a secure conversation.</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR (Main Chat Area) ================= */}
        <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white dark:bg-slate-950 relative`}>
          
          {/* Subtle Dot Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>

          {!activeChat ? (
            <div className="flex-1 flex flex-col items-center justify-center relative z-10 text-slate-400 dark:text-slate-500">
              <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/10 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <MessageSquare size={40} className="text-indigo-500 dark:text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">Neosis Web</h2>
              <p className="text-sm max-w-sm text-center leading-relaxed">Select a contact from the sidebar to start a secure, end-to-end encrypted conversation.</p>
              <div className="mt-8 flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-full">
                <ShieldCheck size={14} className="text-emerald-500"/>
                End-to-end Encrypted
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full relative z-10">
              {/* Chat Header */}
              <div className="px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center justify-between z-20">
                <div className="flex items-center gap-4">
                  <button onClick={() => setActiveChat(null)} className="md:hidden text-slate-400 hover:text-indigo-600 transition">
                    <ArrowLeft size={24} />
                  </button>
                  <div className="relative">
                    <div className={`w-11 h-11 bg-gradient-to-br ${getAvatarGradient(formatName(activeChat))} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {formatName(activeChat).charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">{formatName(activeChat)}</div>
                    <div className="text-[12px] font-medium text-emerald-500 flex items-center gap-1.5 mt-0.5">
                      {isRemoteTyping ? <span className="italic text-indigo-500 animate-pulse">typing...</span> : "Online"}
                    </div>
                  </div>
                </div>

                {/* Header Action Icons */}
                <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
                  <button className="hover:text-indigo-500 transition"><Phone size={20}/></button>
                  <button className="hover:text-indigo-500 transition"><Video size={22}/></button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                  <button className="hover:text-indigo-500 transition"><Search size={20}/></button>
                  <button className="hover:text-indigo-500 transition"><MoreVertical size={20}/></button>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5">
                {/* Date Separator Pill */}
                <div className="flex justify-center mb-6">
                  <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">Today</span>
                </div>

                {isChatLoading ? (
                  <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
                ) : (
                  <AnimatePresence>
                    {messages.map((msg, index) => {
                      const isMe = msg.senderEmail === currentUser.email;
                      return (
                        <motion.div key={msg.id || `${index}-${msg.timestamp}`} initial={{ opacity: 0, y: 10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-5 py-3 text-[15px] leading-relaxed break-words shadow-sm
                              ${isMe 
                                ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-indigo-500/25' 
                                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm shadow-slate-200/20 dark:shadow-none'}`}
                            >
                              {decodeHTMLEntities(msg.content)}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium px-1 flex items-center gap-1">
                              {msg.timestamp || 'Just now'} 
                              {isMe && <Check size={12} className="text-indigo-400" />}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {/* Typing Indicator Bubble */}
                    {isRemoteTyping && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex justify-start">
                        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm flex items-center gap-1.5 w-[72px]">
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full" />
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full" />
                          <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 z-20">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                  
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-end p-1 shadow-inner border border-transparent focus-within:border-indigo-500/30 transition-all">
                    <button type="button" className="p-3 text-slate-400 hover:text-indigo-500 transition-colors">
                      <Smile size={22} />
                    </button>
                    
                    <textarea 
                      value={newMessage} 
                      onChange={handleInputChange} 
                      onKeyDown={(e) => { 
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault(); 
                          handleSendMessage(e); 
                        }
                      }}
                      placeholder="Type your message..." 
                      className="flex-1 bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none text-[15px] py-3 max-h-32 min-h-[44px] resize-none custom-scrollbar" 
                      rows="1"
                    />
                    
                    <button type="button" className="p-3 text-slate-400 hover:text-indigo-500 transition-colors">
                      <Paperclip size={20} />
                    </button>
                  </div>

                  {newMessage.trim() ? (
                    <motion.button 
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} 
                      type="submit" 
                      className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white p-3.5 rounded-full shadow-lg shadow-indigo-500/30 transition-transform hover:scale-105 flex-shrink-0"
                    >
                      <Send size={20} className="ml-0.5" />
                    </motion.button>
                  ) : (
                    <button type="button" className="bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 p-3.5 rounded-full transition-colors flex-shrink-0">
                      <Mic size={22} />
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}