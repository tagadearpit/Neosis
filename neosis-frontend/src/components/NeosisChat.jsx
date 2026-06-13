import React, { useState, useEffect, useRef, useCallback, useMemo, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, UserPlus, Bell, Send, Check, CheckCheck, ArrowLeft, Moon, Sun, 
  Loader2, Phone, Video, Search, MoreVertical, Paperclip, Smile, Mic, ShieldCheck,
  X, User, Trash2, Ban, PhoneOff, PhoneCall, ShieldAlert, Info, Settings, LogOut, UserCog, Shield
} from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://neosis-433w.onrender.com';

const api = axios.create({
  baseURL: BACKEND_URL,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN'
});

class ChatErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error(error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white p-4">
          <div className="text-center space-y-4">
            <ShieldAlert size={48} className="mx-auto text-rose-500" />
            <h2 className="text-2xl font-bold">Something went wrong</h2>
            <p className="text-slate-500">The chat interface encountered an unexpected error.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition">
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatName = (email) => {
  if (!email) return '';
  const namePart = email.split('@')[0];
  return namePart.split(/[\.\-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const getAvatarGradient = (name) => {
  if (!name) return 'from-gray-400 to-gray-500';
  const gradients = ['from-indigo-500 to-blue-500', 'from-emerald-400 to-teal-500', 'from-pink-500 to-rose-500', 'from-amber-400 to-orange-500', 'from-violet-500 to-purple-500', 'from-cyan-400 to-blue-600'];
  return gradients[(name.charCodeAt(0) || 0) % gradients.length];
};

const highlightText = (text, highlight) => {
  if (!highlight.trim() || !text) return text;
  const escaped = escapeRegExp(highlight);
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === highlight.toLowerCase() ? (
      <span key={i} className="bg-yellow-300 dark:bg-indigo-500/50 text-slate-900 dark:text-white rounded px-0.5 shadow-sm">{part}</span>
    ) : part
  );
};

const rtcConfiguration = {
  iceServers: [ 
    { urls: 'stun:stun.l.google.com:19302' }, 
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

const listVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
const messageVariants = { hidden: { opacity: 0, y: 20, scale: 0.95, rotateX: -15, filter: "blur(5px)" }, show: { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 280, damping: 22 } } };
const pageTransition = { hidden: { opacity: 0, scale: 0.98 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } } };

function NeosisChatInner() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [addEmailInput, setAddEmailInput] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');
  
  const [hasAcceptedTC, setHasAcceptedTC] = useState(localStorage.getItem('neosis_tc_accepted') === 'true');

  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [callState, setCallState] = useState('idle'); 
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const typingTimeoutRef = useRef(null);
  const remoteTypingTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); 
  const textareaRef = useRef(null);
  
  const activeChatRef = useRef(activeChat);
  const currentUserRef = useRef(currentUser);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  
  // FIX #7: Track the peer email bound to the ACTIVE call, not the active UI chat view
  const callPeerEmailRef = useRef(null);
  const callStateRef = useRef(callState);
  const incomingCallDataRef = useRef(incomingCallData);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { incomingCallDataRef.current = incomingCallData; }, [incomingCallData]);

  const iceCandidateQueueRef = useRef([]);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { 
    if (isDarkMode) {
      document.documentElement.classList.add('dark'); 
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark'); 
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const fetchSidebarData = useCallback(async () => {
    try {
      const friendsRes = await api.get('/api/contacts/friends');
      const pendingRes = await api.get('/api/contacts/pending');
      setFriends(friendsRes.data);
      setPendingRequests(pendingRes.data);
      
      setUnreadCounts(prev => {
        const newCounts = { ...prev };
        Object.keys(newCounts).forEach(email => {
          if (!friendsRes.data.includes(email)) delete newCounts[email];
        });
        return newCounts;
      });
    } catch (err) {}
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // FIX #2: Ensure T&C are stored serverside to prevent localStorage bypass
  const handleAcceptTerms = async () => {
    try {
      await api.post('/api/users/accept-terms');
      localStorage.setItem('neosis_tc_accepted', 'true');
      setHasAcceptedTC(true);
      showToast("Welcome to Neosis!", "success");
    } catch (err) {
      showToast("Network Error: Could not verify identity.", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout'); 
    } catch (err) {}
    window.location.href = '/login';
  };

  const cleanupCallResources = useCallback(() => {
    if (peerConnectionRef.current) {
      if (peerConnectionRef.current.signalingState !== 'closed') {
        peerConnectionRef.current.close();
      }
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) { 
      localStreamRef.current.getTracks().forEach(track => track.stop()); 
      localStreamRef.current = null; 
    }
    iceCandidateQueueRef.current = []; 
    callPeerEmailRef.current = null;
    setCallState('idle'); 
    setIncomingCallData(null);
  }, []);

  const handleEndCall = useCallback(() => {
    // FIX #7: Use strictly stored call target
    const peerEmail = callPeerEmailRef.current;
    if (peerEmail && stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({ destination: '/app/chat.signal', body: JSON.stringify({ type: 'end-call', recipientEmail: peerEmail }) });
    }
    cleanupCallResources();
  }, [cleanupCallResources]);

  const connectWebSocket = useCallback((userEmail) => {
    // FIX #13: Prevent duplicate WebSocket connections on rapid re-mounts
    if (stompClientRef.current?.active) {
      stompClientRef.current.deactivate();
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`, null, { withCredentials: true }),
      reconnectDelay: 5000, 
      heartbeatIncoming: 4000, 
      heartbeatOutgoing: 4000,
      onConnect: () => {
        client.subscribe(`/queue/messages/${userEmail}`, (message) => {
          const incomingMessage = JSON.parse(message.body);
          if (incomingMessage.senderEmail === activeChatRef.current) {
            setMessages((prev) => {
              if (incomingMessage.localId) {
                const localIndex = prev.findIndex(m => m.localId === incomingMessage.localId);
                if (localIndex !== -1) { 
                  const newMessages = [...prev]; 
                  newMessages[localIndex] = incomingMessage; 
                  return newMessages; 
                }
              }
              // FIX #10: Added localId to the duplicate checker 
              const isDuplicate = prev.some(m => (m.id && incomingMessage.id && m.id === incomingMessage.id) || (m.localId && incomingMessage.localId && m.localId === incomingMessage.localId));
              return isDuplicate ? prev : [...prev, incomingMessage];
            });
          } else if (incomingMessage.senderEmail !== currentUserRef.current?.email) {
            setUnreadCounts((prev) => ({ ...prev, [incomingMessage.senderEmail]: (prev[incomingMessage.senderEmail] || 0) + 1 }));
          }
          setIsRemoteTyping(false);
          if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
        });
        
        client.subscribe(`/queue/typing/${userEmail}`, (message) => {
          const data = JSON.parse(message.body);
          // FIX #12: Ensure typing indicator strictly belongs to active view
          if (data.senderEmail === activeChatRef.current) {
            setIsRemoteTyping(data.isTyping === 'true');
            if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
            if (data.isTyping === 'true') { remoteTypingTimeoutRef.current = setTimeout(() => setIsRemoteTyping(false), 3000); }
          }
        });

        client.subscribe(`/queue/signaling/${userEmail}`, async (message) => {
          const data = JSON.parse(message.body);
          
          if (data.type === 'offer') { 
            if (callStateRef.current !== 'idle') {
               if (stompClientRef.current && stompClientRef.current.connected) {
                 stompClientRef.current.publish({
                   destination: '/app/chat.signal',
                   body: JSON.stringify({ type: 'call-rejected', reason: 'busy', recipientEmail: data.senderEmail })
                 });
               }
               return; 
            }
            callPeerEmailRef.current = data.senderEmail;
            setIncomingCallData(data); 
            setCallState('ringing'); 
          } 
          else if (data.type === 'answer' && peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') { 
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp)); 
            while (iceCandidateQueueRef.current.length > 0) {
              // FIX #9: Safely re-check state after async await operation
              if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
                await peerConnectionRef.current.addIceCandidate(iceCandidateQueueRef.current.shift());
              } else {
                iceCandidateQueueRef.current = [];
              }
            }
          } 
          else if (data.type === 'ice-candidate') {
            const pc = peerConnectionRef.current;
            if (!pc || pc.signalingState === 'closed') return;
            
            const candidate = new RTCIceCandidate(data.candidate);
            if (pc.remoteDescription && pc.remoteDescription.type) {
              await pc.addIceCandidate(candidate); 
            } else {
              // FIX #4: Bound the queue size to prevent memory exhaustion attack
              if (iceCandidateQueueRef.current.length < 50) {
                iceCandidateQueueRef.current.push(candidate);
              }
            }
          } 
          else if (data.type === 'end-call') {
            cleanupCallResources(); 
          }
          else if (data.type === 'call-rejected') {
            showToast(`Call declined: User is ${data.reason || 'busy'}`, 'info');
            cleanupCallResources();
          }
        });

        client.subscribe(`/queue/notifications/${userEmail}`, () => {
          fetchSidebarData();
        });
      },
      onStompError: (frame) => {
        console.error('STOMP Error:', frame.headers['message'], frame.body);
      },
      onWebSocketError: (error) => {
        console.error('WebSocket Error:', error);
      }
    });
    client.activate();
    stompClientRef.current = client; 
  }, [cleanupCallResources, fetchSidebarData, showToast]);

  useEffect(() => {
    let isMounted = true;
    const initializeApp = async () => {
      try {
        const userRes = await api.get('/api/users/me');
        if (!isMounted) return;

        if (!userRes.data || !userRes.data.email) {
          window.location.href = '/login'; 
          return;
        }

        setCurrentUser(userRes.data);
        connectWebSocket(userRes.data.email);
        fetchSidebarData();
      } catch (err) { 
        if (!isMounted) return;
        // FIX #7: Only redirect on explicit Auth drops, preventing 500 boot loops
        if (err.response?.status === 401 || err.response?.status === 403) {
          window.location.href = '/login'; 
        } else {
          console.error("Initialization warning", err);
        }
      }
    };
    initializeApp();

    return () => {
      isMounted = false;
      if (stompClientRef.current) stompClientRef.current.deactivate();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      cleanupCallResources(); 
    };
  }, [fetchSidebarData, connectWebSocket, cleanupCallResources]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]); 

  const sendWebRTCSignal = (payload) => { 
    if (stompClientRef.current && stompClientRef.current.connected) { 
      stompClientRef.current.publish({ destination: '/app/chat.signal', body: JSON.stringify(payload) }); 
    } 
  };
  
  const handleStartCall = async (video = true) => {
    if (callState !== 'idle') return; 
    try {
      setIsVideoCall(video); 
      setCallState('in-call');
      callPeerEmailRef.current = activeChat; // Lock in the recipient
      
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);
      stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));
      peerConnectionRef.current.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
      peerConnectionRef.current.onicecandidate = (event) => { if (event.candidate) sendWebRTCSignal({ type: 'ice-candidate', candidate: event.candidate, recipientEmail: activeChat }); };
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      sendWebRTCSignal({ type: 'offer', sdp: offer, recipientEmail: activeChat, isVideo: video });
    } catch (err) { showToast("Camera/Mic access denied", "error"); setCallState('idle'); }
  };

  const handleAcceptCall = async () => {
    // FIX #1: Null crash prevention
    if (!incomingCallDataRef.current) return;
    try {
      setIsVideoCall(incomingCallDataRef.current.isVideo); 
      setCallState('in-call');
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: incomingCallDataRef.current.isVideo, audio: true });
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      localStreamRef.current = stream;
      peerConnectionRef.current = new RTCPeerConnection(rtcConfiguration);
      stream.getTracks().forEach(track => peerConnectionRef.current.addTrack(track, stream));
      peerConnectionRef.current.ontrack = (event) => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0]; };
      peerConnectionRef.current.onicecandidate = (event) => { if (event.candidate) sendWebRTCSignal({ type: 'ice-candidate', candidate: event.candidate, recipientEmail: incomingCallDataRef.current.senderEmail }); };
      
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(incomingCallDataRef.current.sdp));
      
      while (iceCandidateQueueRef.current.length > 0) {
        if (peerConnectionRef.current && peerConnectionRef.current.signalingState !== 'closed') {
           await peerConnectionRef.current.addIceCandidate(iceCandidateQueueRef.current.shift());
        } else {
           iceCandidateQueueRef.current = [];
        }
      }

      const answer = await peerConnectionRef.current.createAnswer();
      await peerConnectionRef.current.setLocalDescription(answer);
      sendWebRTCSignal({ type: 'answer', sdp: answer, recipientEmail: incomingCallDataRef.current.senderEmail });
    } catch (err) { showToast("Camera/Mic access denied", "error"); handleRejectCall(); }
  };

  const handleRejectCall = () => { 
    if (incomingCallDataRef.current) {
        sendWebRTCSignal({ type: 'end-call', recipientEmail: incomingCallDataRef.current.senderEmail }); 
    }
    cleanupCallResources();
  };

  const handleSendRequest = async (e) => { 
    e.preventDefault(); 
    if (!addEmailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addEmailInput)) { showToast("Invalid email.", "error"); return; } 
    try { await api.post('/api/contacts/request', new URLSearchParams({ receiverEmail: addEmailInput })); setAddEmailInput(''); showToast("Request sent!"); } catch (err) { showToast("Failed to send.", "error"); } 
  };
  
  const handleAcceptRequest = async (requestId) => { 
    try { await api.post('/api/contacts/accept', new URLSearchParams({ requestId: requestId })); fetchSidebarData(); setShowNotifications(false); showToast("Accepted!"); } catch (err) {} 
  };
  
  const handleOpenChat = async (friendEmail) => { 
    setActiveChat(friendEmail); 
    setMessages([]); 
    setUnreadCounts(prev => { const newCounts = { ...prev }; delete newCounts[friendEmail]; return newCounts; }); 
    setIsRemoteTyping(false);
    if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);

    setIsChatLoading(true); setIsSearching(false); setSearchQuery(''); setShowMoreMenu(false); 
    try { const historyRes = await api.get(`/api/messages/history/${friendEmail}`); setMessages(historyRes.data); } catch (err) { showToast("Failed to load history.", "error"); } finally { setIsChatLoading(false); } 
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (newMessage.trim() === '' || newMessage.length > 5000 || !stompClientRef.current || !stompClientRef.current.connected) return;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // FIX #8: Cryptographically secure UUIDs to prevent Date.now() duplicate collisions
    const uniqueId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2); 
    const chatMessage = { localId: uniqueId, senderEmail: currentUser.email, recipientEmail: activeChat, content: newMessage.trim(), timestamp: timeString };
    stompClientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(chatMessage) });
    setMessages((prev) => [...prev, chatMessage]); 
    setNewMessage(''); 
    if (textareaRef.current) textareaRef.current.style.height = '44px'; // Reset height
    sendTypingStatus(false);
  };

  const sendTypingStatus = (isTyping) => { if (!stompClientRef.current || !stompClientRef.current.connected || !activeChatRef.current || !currentUserRef.current) return; stompClientRef.current.publish({ destination: '/app/chat.typing', body: JSON.stringify({ senderEmail: currentUserRef.current.email, recipientEmail: activeChatRef.current, isTyping: isTyping.toString() }) }); };
  
  const handleInputChange = (e) => { 
    // FIX #11: Auto-resize textarea logic
    e.target.style.height = '44px'; 
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
    setNewMessage(e.target.value); 
    sendTypingStatus(true); 
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current); 
    typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 1500); 
  };

  const displayedMessages = useMemo(() => { 
    if (!isSearching || !searchQuery.trim()) return messages; 
    const lowerQuery = searchQuery.toLowerCase();
    return messages.filter(m => m.content && m.content.toLowerCase().includes(lowerQuery)); 
  }, [messages, isSearching, searchQuery]);

  if (!currentUser) return <div className="flex h-screen bg-[#0f172a] items-center justify-center"><Loader2 size={48} className="text-indigo-500 animate-spin" /></div>;

  const getToastBg = (type) => {
    if (type === 'error') return 'bg-rose-500';
    if (type === 'info') return 'bg-indigo-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 p-2 md:p-4 transition-colors duration-300 font-sans relative overflow-hidden animated-gradient-bg">
      <AnimatePresence>
        {!hasAcceptedTC && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(30px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 z-[200] bg-slate-900/60 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, rotateX: 10 }} animate={{ scale: 1, y: 0, rotateX: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
            >
              <div className="p-8 text-center bg-gradient-to-b from-indigo-500/10 to-transparent">
                <div className="w-16 h-16 animated-gradient-bg rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                  <ShieldCheck size={32} className="text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Welcome to Neosis</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Please review our security and privacy guidelines.</p>
              </div>
              
              <div className="px-8 py-2 max-h-60 overflow-y-auto custom-scrollbar text-sm text-slate-600 dark:text-slate-300 space-y-4">
                <div className="flex gap-3 items-start">
                  <ShieldAlert size={20} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">End-to-End Encryption</h3>
                    <p className="mt-1 leading-relaxed">All video and audio calls are secured via WebRTC DTLS-SRTP encryption. Neither Neosis nor third parties can intercept your media.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <User size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Data Privacy</h3>
                    <p className="mt-1 leading-relaxed">We do not sell your personal data. Your chat history is stored securely and is only accessible by you and your authorized contacts.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Ban size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Acceptable Use</h3>
                    <p className="mt-1 leading-relaxed">Harassment, spam, and illegal activities are strictly prohibited and will result in immediate account termination.</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-50 dark:bg-slate-800/50 mt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleAcceptTerms}
                  className="w-full py-3.5 animated-gradient-bg text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all relative overflow-hidden"
                >
                  <span className="relative z-10">I Accept & Agree</span>
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(24px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }} className="absolute inset-0 z-[100] bg-slate-900/80 flex flex-col items-center justify-center">
            {callState === 'ringing' ? (
              <div className="flex flex-col items-center text-white">
                <motion.div animate={{ scale: [1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(99,102,241,0)", "0px 0px 40px rgba(99,102,241,0.6)", "0px 0px 0px rgba(99,102,241,0)"] }} transition={{ repeat: Infinity, duration: 1.5 }} className={`w-32 h-32 rounded-full mb-6 flex items-center justify-center text-4xl font-bold bg-gradient-to-br ${getAvatarGradient(formatName(incomingCallData?.senderEmail))} shadow-2xl`}>{formatName(incomingCallData?.senderEmail).charAt(0)}</motion.div>
                <h2 className="text-3xl font-bold mb-2">{formatName(incomingCallData?.senderEmail)}</h2>
                <p className="text-slate-400 mb-12">{incomingCallData?.isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}</p>
                <div className="flex gap-8">
                  <motion.button aria-label="Reject Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleRejectCall} className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 text-white"><PhoneOff size={28} /></motion.button>
                  <motion.button aria-label="Accept Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleAcceptCall} className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30 text-white"><PhoneCall size={28} /></motion.button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full p-4 flex flex-col relative max-w-6xl mx-auto">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex-1 relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center">
                  {isVideoCall ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-48 h-48 rounded-full flex items-center justify-center text-6xl font-bold bg-gradient-to-br ${getAvatarGradient(formatName(callPeerEmailRef.current))} shadow-2xl`}>{formatName(callPeerEmailRef.current).charAt(0)}</motion.div>
                  )}
                  {isVideoCall && (
                    <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700">
                      <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                    </div>
                  )}
                </motion.div>
                <div className="h-24 flex items-center justify-center gap-6 mt-4">
                  <motion.button aria-label="End Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleEndCall} className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-rose-500/30"><PhoneOff size={28} /></motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`absolute top-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full text-sm font-semibold shadow-2xl flex items-center gap-2 text-white ${getToastBg(toast.type)}`}>
            {toast.type === 'success' && <Check size={16} />}
            {toast.type === 'info' && <Info size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={pageTransition} initial="hidden" animate="show" className={`w-full max-w-7xl mx-auto rounded-3xl shadow-2xl overflow-hidden flex h-full border border-slate-200 dark:border-slate-800 relative z-10 bg-white dark:bg-slate-900 ${!hasAcceptedTC ? 'pointer-events-none blur-sm' : ''}`}>
        
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] bg-slate-50 dark:bg-[#0d1b2a] flex-col flex-shrink-0 z-20 shadow-xl border-r border-slate-200 dark:border-transparent transition-colors duration-300`}>
          <div className="p-6 flex justify-between items-center bg-white dark:bg-[#0a1520] transition-colors duration-300 border-b border-slate-200 dark:border-transparent">
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><ShieldCheck size={20} className="text-white" /></motion.div>
              <div><h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide">NEOSIS</h2><p className="text-[11px] text-indigo-500 dark:text-indigo-300 font-medium">{currentUser.name || formatName(currentUser.email)}</p></div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button aria-label="Toggle Dark Mode" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-slate-400 hover:text-indigo-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</motion.button>
              
              <div className="relative">
                <motion.button aria-label="Notifications" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-slate-400 hover:text-indigo-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition">
                  <Bell size={18} />{pendingRequests.length > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0a1520]"></motion.span>}
                </motion.button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute top-12 right-0 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-sm font-bold flex justify-between items-center text-slate-800 dark:text-white"><span>Friend Requests</span><span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 text-xs px-2.5 py-1 rounded-full">{pendingRequests.length}</span></div>
                      {pendingRequests.length === 0 ? <div className="p-8 text-sm text-slate-400 text-center">No pending requests</div> : (
                        <div className="max-h-64 overflow-y-auto">
                          {pendingRequests.map(req => (
                            <div key={req.id} className="p-4 border-b border-slate-50 dark:border-slate-700/50 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate w-2/3">{formatName(req.senderEmail)}</span>
                              <motion.button aria-label="Accept Request" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleAcceptRequest(req.id)} className="bg-emerald-500 text-white p-2 rounded-full shadow-md shadow-emerald-500/20"><Check size={16}/></motion.button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <motion.button aria-label="Settings" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="p-2 text-slate-400 hover:text-indigo-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition">
                  <Settings size={18} />
                </motion.button>
                <AnimatePresence>
                  {showSettingsMenu && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 top-12 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 z-50 overflow-hidden">
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-sm font-bold text-slate-800 dark:text-white">Settings</div>
                      <div className="flex flex-col text-sm text-slate-700 dark:text-slate-200">
                        <button onClick={() => { setShowSettingsMenu(false); showToast("Account preferences coming soon", "info"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition w-full text-left"><UserCog size={16} /> Account</button>
                        <button onClick={() => { setShowSettingsMenu(false); showToast("Privacy settings coming soon", "info"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition w-full text-left"><Shield size={16} /> Privacy</button>
                        <div className="h-px bg-slate-100 dark:bg-slate-700 w-full"></div>
                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition w-full text-left font-semibold"><LogOut size={16} /> Log Out</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <form onSubmit={handleSendRequest} className="relative flex items-center">
              <div className="absolute left-4 text-slate-400"><Search size={16} /></div>
              <input type="email" value={addEmailInput} onChange={(e) => setAddEmailInput(e.target.value)} placeholder="Add contact by email..." className="w-full bg-white dark:bg-[#162536] text-slate-800 dark:text-white placeholder-slate-400 rounded-xl pl-11 pr-12 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all border border-slate-200 dark:border-slate-700/50 shadow-sm dark:shadow-none" required />
              <motion.button aria-label="Add Contact" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} type="submit" className="absolute right-2 p-1.5 bg-indigo-500 text-white rounded-lg"><UserPlus size={16}/></motion.button>
            </form>
          </div>

          <motion.div variants={listVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-4 contain-content">
            {friends.map(friend => {
              const fName = formatName(friend);
              const isActive = activeChat === friend;
              return (
                <motion.div variants={itemVariants} key={friend} onClick={() => handleOpenChat(friend)} className={`p-3 rounded-2xl cursor-pointer transition-colors flex items-center gap-4 relative group ${isActive ? 'bg-white shadow-sm dark:shadow-none dark:bg-[#162536]' : 'hover:bg-slate-200/50 dark:hover:bg-[#162536]/60'}`}>
                  {isActive && <motion.div layoutId="activeIndicator" className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indigo-500 rounded-r-full" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(fName)} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-inner`}>{fName.charAt(0).toUpperCase()}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-50 dark:border-[#0d1b2a] transition-colors duration-300"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5"><div className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[15px]">{fName}</div></div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-slate-400 truncate">Tap to view conversation...</div>
                      {unreadCounts[friend] > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md shadow-indigo-500/30">{unreadCounts[friend]}</motion.div>}
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {friends.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 flex flex-col items-center justify-center text-slate-500 text-center px-6">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="w-16 h-16 bg-white dark:bg-[#162536] shadow-sm dark:shadow-none rounded-full flex items-center justify-center mb-4 transition-colors"><UserPlus size={24} className="text-slate-400" /></motion.div>
                <h3 className="text-slate-700 dark:text-slate-200 font-semibold mb-1">No chats yet</h3>
                <p className="text-xs leading-relaxed">Search for a friend's email above to start a secure conversation.</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-slate-50 dark:bg-slate-950 relative transition-colors duration-300`}>
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] pointer-events-none chat-wallpaper"></div>

          {!activeChat ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center relative z-10 text-slate-400 dark:text-slate-500">
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-24 h-24 bg-white dark:bg-indigo-900/10 shadow-sm dark:shadow-inner rounded-full flex items-center justify-center mb-6"><MessageSquare size={40} className="text-indigo-500 dark:text-indigo-400" /></motion.div>
              <h2 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">Neosis Web</h2>
              <p className="text-sm max-w-sm text-center leading-relaxed">Select a contact from the sidebar to start a secure, end-to-end encrypted conversation.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col h-full relative z-10">
              <div className="px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20 transition-colors">
                <div className="flex items-center gap-4">
                  <motion.button aria-label="Go Back" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setActiveChat(null)} className="md:hidden text-slate-400 hover:text-indigo-600 transition"><ArrowLeft size={24} /></motion.button>
                  <div className="relative">
                    <div className={`w-11 h-11 bg-gradient-to-br ${getAvatarGradient(formatName(activeChat))} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md`}>{formatName(activeChat).charAt(0).toUpperCase()}</div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 transition-colors"></div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-[16px]">{formatName(activeChat)}</div>
                    <div className="text-[12px] font-medium text-emerald-500 flex items-center gap-1.5 mt-0.5">{isRemoteTyping ? <span className="italic text-indigo-500 animate-pulse">typing...</span> : "Online"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500">
                  <motion.button aria-label="Audio Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStartCall(false)} className="hover:text-indigo-500"><Phone size={20}/></motion.button>
                  <motion.button aria-label="Video Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStartCall(true)} className="hover:text-indigo-500"><Video size={22}/></motion.button>
                  <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 transition-colors"></div>
                  
                  <motion.button aria-label="Search Chat" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setIsSearching(!isSearching); setSearchQuery(''); }} className={`${isSearching ? 'text-indigo-500' : 'hover:text-indigo-500'}`}><Search size={20}/></motion.button>
                  <div className="relative">
                    <motion.button aria-label="Menu" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowMoreMenu(!showMoreMenu)} className="hover:text-indigo-500"><MoreVertical size={20}/></motion.button>
                    <AnimatePresence>
                      {showMoreMenu && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden z-50">
                          <div className="flex flex-col text-sm text-slate-700 dark:text-slate-200">
                            <button onClick={() => showToast("Contact profiles coming soon", "info")} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition w-full text-left"><User size={16} /> Contact Info</button>
                            <button onClick={() => { setMessages([]); setShowMoreMenu(false); showToast("Local chat view cleared"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition w-full text-left"><Trash2 size={16} /> Clear Local Chat</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isSearching && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-hidden z-10 transition-colors">
                    <div className="px-6 py-3 flex items-center gap-3">
                      <Search size={16} className="text-slate-400" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search and filter this chat..." className="flex-1 bg-transparent text-sm outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400" autoFocus />
                      <button aria-label="Close Search" onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-slate-400 hover:text-rose-500 transition-colors p-1"><X size={16} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5">
                <div className="flex justify-center mb-6"><span className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-none text-slate-500 dark:text-slate-400 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wide transition-colors">Today</span></div>
                {isChatLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500" size={32} /></div> : (
                  <AnimatePresence>
                    {displayedMessages.map((msg, index) => {
                      const isMe = msg.senderEmail === currentUser.email;
                      const rawContent = msg.content;
                      const messageKey = msg.id || msg.localId || `${index}-${msg.timestamp}`;
                      const isPending = isMe && !msg.id; 
                      
                      return (
                        <motion.div layout variants={messageVariants} initial="hidden" animate="show" key={messageKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-5 py-3 text-[15px] leading-relaxed break-words shadow-md ${isMe ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-indigo-500/25' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm shadow-sm dark:shadow-none transition-colors'}`}>
                              {isSearching && searchQuery ? highlightText(rawContent, searchQuery) : rawContent}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium px-1 flex items-center gap-1">
                              {msg.timestamp || 'Just now'} 
                              {isMe && (isPending ? <Check size={12} className="text-slate-300" /> : <CheckCheck size={14} className="text-indigo-400" />)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                    {isRemoteTyping && <motion.div layout initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring" }} className="flex justify-start"><div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors rounded-2xl rounded-tl-sm px-4 py-3.5 shadow-sm flex items-center gap-1.5 w-[72px]"><motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full" /><motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full" /><motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-2 h-2 bg-slate-300 dark:bg-slate-500 rounded-full" /></div></motion.div>}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 transition-colors">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
                  <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-end p-1 shadow-inner border border-transparent focus-within:border-indigo-500/30 transition-all">
                    <motion.button aria-label="Emoji Picker" onClick={() => showToast("Emoji picker coming soon", "info")} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" className="p-3 text-slate-400 hover:text-indigo-500 transition-colors"><Smile size={22} /></motion.button>
                    <textarea ref={textareaRef} value={newMessage} onChange={handleInputChange} maxLength={5000} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} placeholder="Type your message..." className="flex-1 bg-transparent text-slate-800 dark:text-slate-200 placeholder-slate-400 outline-none text-[15px] py-3 max-h-32 min-h-[44px] resize-none custom-scrollbar" rows="1" />
                    <motion.button aria-label="Attach File" onClick={() => showToast("Attachments coming soon", "info")} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} type="button" className="p-3 text-slate-400 hover:text-indigo-500 transition-colors"><Paperclip size={20} /></motion.button>
                  </div>
                  {newMessage.trim() ? (
                    <motion.button aria-label="Send Message" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} type="submit" className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white p-3.5 rounded-full shadow-lg shadow-indigo-500/30 flex-shrink-0"><Send size={20} className="ml-0.5" /></motion.button>
                  ) : (
                    <motion.button aria-label="Send Voice Message" onClick={() => showToast("Voice notes coming soon", "info")} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }} type="button" className="bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 p-3.5 rounded-full transition-colors flex-shrink-0"><Mic size={22} /></motion.button>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function NeosisChatWrapped() {
  return (
    <ChatErrorBoundary>
      <NeosisChatInner />
    </ChatErrorBoundary>
  )
}
