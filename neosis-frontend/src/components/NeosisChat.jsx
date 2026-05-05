import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { MessageSquare, UserPlus, Bell, Send, Check, ArrowLeft } from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

axios.defaults.withCredentials = true;

export default function NeosisChat() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // States for WhatsApp Architecture
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [addEmailInput, setAddEmailInput] = useState('');

  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); 

  // This is the crucial line!
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

  // 1. Initialize user and load sidebar data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        const userRes = await axios.get(`${backendUrl}/api/users/me`);
        setCurrentUser(userRes.data);
        connectWebSocket(userRes.data.email);
        fetchSidebarData();
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initializeApp();
  }, []);

  // 2. Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isRemoteTyping]);

  // 3. Fetch Friends and Requests from the backend
  const fetchSidebarData = async () => {
    try {
      const friendsRes = await axios.get(`${backendUrl}/api/contacts/friends`);
      const pendingRes = await axios.get(`${backendUrl}/api/contacts/pending`);
      setFriends(friendsRes.data);
      setPendingRequests(pendingRes.data);
    } catch (err) {
      console.error("Failed to load sidebar data", err);
    }
  };

  // 4. Connect WebSocket for Real-Time data
  const connectWebSocket = (userEmail) => {
    const client = new Client({
      webSocketFactory: () => new SockJS(`${backendUrl}/ws`),
      onConnect: () => {
        // Listen for new messages
        client.subscribe(`/queue/messages/${userEmail}`, (message) => {
          const incomingMessage = JSON.parse(message.body);
          // Only add to the screen if the message is from our currently active chat
          setMessages((prev) => [...prev, incomingMessage]);
          setIsRemoteTyping(false);
        });
        
        // Listen for typing indicators
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

  // 5. Send a Friend Request
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if(!addEmailInput) return;
    try {
      await axios.post(`${backendUrl}/api/contacts/request?receiverEmail=${addEmailInput}`);
      setAddEmailInput('');
      alert("Friend request sent!");
    } catch (err) {
      alert("Failed to send request. Make sure the email is correct.");
    }
  };

  // 6. Accept a Friend Request
  const handleAcceptRequest = async (requestId) => {
    try {
      await axios.post(`${backendUrl}/api/contacts/accept?requestId=${requestId}`);
      fetchSidebarData(); // Refresh the list to show the new friend
      setShowNotifications(false); // Close the dropdown
    } catch (err) {
      console.error("Failed to accept request", err);
    }
  };

  // 7. Open a chat and load history
  const openChat = async (friendEmail) => {
    setActiveChat(friendEmail);
    try {
      // Fetch persisted history from the database!
      const historyRes = await axios.get(`${backendUrl}/api/messages/history/${friendEmail}`);
      setMessages(historyRes.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  // 8. Send a Message
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
    
    // Send to backend
    stompClientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(chatMessage) });
    
    // Add to own screen
    setMessages((prev) => [...prev, chatMessage]);
    setNewMessage('');
    sendTypingStatus(false);
  };

  // 9. Handle Typing Indicators
  const sendTypingStatus = (isTyping) => {
    if (stompClientRef.current && activeChat) {
      stompClientRef.current.publish({
        destination: '/app/chat.typing',
        body: JSON.stringify({ senderEmail: currentUser.email, recipientEmail: activeChat, isTyping: isTyping.toString() })
      });
    }
  };

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    sendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 1500);
  };

  if(!currentUser) return <div className="flex h-screen items-center justify-center font-semibold text-blue-600">Loading Neosis...</div>;

  return (
    <div className="flex h-screen bg-slate-100 p-4 relative">
      <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex h-full">
        
        {/* ================= LEFT SIDEBAR ================= */}
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-1/3 bg-slate-50 border-r border-gray-200 flex-col`}>
          
          {/* Sidebar Header & Profile */}
          <div className="p-5 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex justify-between items-center z-20">
            <div>
              <h2 className="text-xl font-bold tracking-wide">NEOSIS</h2>
              <p className="text-xs text-blue-200 mt-1">{currentUser.name}</p>
            </div>
            
            {/* Notification Bell */}
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
              
              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: 10 }} 
                    className="absolute top-12 right-0 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 text-gray-800 overflow-hidden"
                  >
                    <div className="p-3 bg-gray-50 border-b text-sm font-bold flex justify-between items-center">
                      <span>Friend Requests</span>
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{pendingRequests.length}</span>
                    </div>
                    {pendingRequests.length === 0 ? (
                      <div className="p-6 text-sm text-gray-500 text-center">No pending requests</div>
                    ) : (
                      pendingRequests.map(req => (
                        <div key={req.id} className="p-3 border-b flex justify-between items-center hover:bg-gray-50 transition">
                          <span className="text-sm truncate w-2/3" title={req.senderEmail}>{req.senderEmail}</span>
                          <button 
                            onClick={() => handleAcceptRequest(req.id)} 
                            className="bg-green-500 text-white p-1.5 rounded-full hover:bg-green-600 transition shadow-sm"
                            title="Accept Request"
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

          {/* Add Contact Form */}
          <form onSubmit={handleSendRequest} className="p-4 border-b border-gray-200 bg-white flex gap-2">
            <input 
              type="email" 
              value={addEmailInput} 
              onChange={(e) => setAddEmailInput(e.target.value)} 
              placeholder="Add contact by email..." 
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition" 
              required 
            />
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition">
              <UserPlus size={18}/>
            </button>
          </form>

          {/* Contacts List */}
          <div className="flex-1 overflow-y-auto">
            {friends.map(friend => (
              <div 
                key={friend} 
                onClick={() => openChat(friend)} 
                className={`p-4 border-b border-gray-100 cursor-pointer transition-colors flex items-center gap-3 ${activeChat === friend ? 'bg-blue-50 border-l-4 border-l-blue-600' : 'hover:bg-gray-50'}`}
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                  {friend.charAt(0).toUpperCase()}
                </div>
                <div className="font-semibold text-sm text-gray-800 truncate flex-1">{friend}</div>
              </div>
            ))}
            {friends.length === 0 && (
              <div className="p-8 flex flex-col items-center justify-center text-gray-400 text-center h-full">
                <UserPlus size={32} className="mb-2 opacity-50" />
                <p className="text-sm">No chats yet.</p>
                <p className="text-xs mt-1">Send a request to start talking!</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= RIGHT SIDEBAR (Main Chat) ================= */}
        <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-2/3 flex-col bg-white`}>
          {!activeChat ? (
            // Placeholder when no chat is selected
            <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-gray-400">
              <MessageSquare size={64} className="mb-4 text-gray-300" />
              <h2 className="text-xl font-medium text-gray-600">Neosis for Web</h2>
              <p className="text-sm mt-2 max-w-xs text-center leading-relaxed">Select a contact from the sidebar to start a secure, end-to-end encrypted conversation.</p>
            </div>
          ) : (
            // Active Chat UI
            <>
              {/* Chat Header */}
              <div className="px-6 py-4 border-b border-gray-100 bg-white flex items-center gap-4 shadow-sm z-10">
                <button 
                  onClick={() => setActiveChat(null)}
                  className="md:hidden text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition"
                >
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg shadow-inner">
                  {activeChat.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-gray-800">{activeChat}</div>
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
              
              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto bg-slate-50 space-y-4" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <AnimatePresence>
                  {messages.map((msg, index) => {
                    const isMe = msg.senderEmail === currentUser.email;
                    return (
                      <motion.div key={index} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`px-5 py-3 text-[15px] shadow-sm leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'}`}>
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-gray-400 mt-1 font-medium px-1">{msg.timestamp || 'Just now'}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                  
                  {/* Bouncing Dots Typing Indicator */}
                  {isRemoteTyping && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="flex justify-start">
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

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-100 flex gap-3">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={handleInputChange} 
                  placeholder="Type a message..." 
                  className="flex-1 px-5 py-3.5 bg-slate-100 border-transparent rounded-full focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-inner" 
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
}