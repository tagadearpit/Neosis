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
        <div className="flex h-screen items-center justify-center bg-[#111313] text-white p-4">
          <div className="text-center space-y-4">
            <ShieldAlert size={48} className="mx-auto text-rose-500" />
            <h2 className="text-2xl font-bold font-display">Something went wrong</h2>
            <p className="text-gray-400">The chat interface encountered an unexpected error.</p>
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-[#0fa384] text-white rounded-full hover:bg-[#0ba082] transition-colors">
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
  if (!name) return 'from-gray-600 to-gray-700';
  const gradients = ['from-[#0fa384] to-emerald-600', 'from-blue-500 to-indigo-600', 'from-purple-500 to-violet-600', 'from-rose-500 to-pink-600', 'from-amber-500 to-orange-600'];
  return gradients[(name.charCodeAt(0) || 0) % gradients.length];
};

const highlightText = (text, highlight) => {
  if (!highlight.trim() || !text) return text;
  const escaped = escapeRegExp(highlight);
  const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === highlight.toLowerCase() ? (
      <span key={i} className="bg-[#0fa384]/30 text-[#0fa384] rounded px-0.5">{part}</span>
    ) : part
  );
};

const rtcConfiguration = {
  iceServers: [ 
    { urls: 'stun:stun.l.google.com:19302' }, 
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
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
    try { await api.post('/logout'); } catch (err) {}
    window.location.href = '/login';
  };

  const cleanupCallResources = useCallback(() => {
    if (peerConnectionRef.current) {
      if (peerConnectionRef.current.signalingState !== 'closed') peerConnectionRef.current.close();
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
    const peerEmail = callPeerEmailRef.current;
    if (peerEmail && stompClientRef.current && stompClientRef.current.connected) {
      stompClientRef.current.publish({ destination: '/app/chat.signal', body: JSON.stringify({ type: 'end-call', recipientEmail: peerEmail }) });
    }
    cleanupCallResources();
  }, [cleanupCallResources]);

  const connectWebSocket = useCallback((userEmail) => {
    if (stompClientRef.current?.active) stompClientRef.current.deactivate();

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
                 stompClientRef.current.publish({ destination: '/app/chat.signal', body: JSON.stringify({ type: 'call-rejected', reason: 'busy', recipientEmail: data.senderEmail }) });
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
            } else if (iceCandidateQueueRef.current.length < 50) {
              iceCandidateQueueRef.current.push(candidate);
            }
          } 
          else if (data.type === 'end-call') { cleanupCallResources(); }
          else if (data.type === 'call-rejected') {
            showToast(`Call declined: User is ${data.reason || 'busy'}`, 'info');
            cleanupCallResources();
          }
        });

        client.subscribe(`/queue/notifications/${userEmail}`, () => fetchSidebarData());
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
        if (!userRes.data || !userRes.data.email) { window.location.href = '/login'; return; }
        setCurrentUser(userRes.data);
        connectWebSocket(userRes.data.email);
        fetchSidebarData();
      } catch (err) { 
        if (!isMounted) return;
        if (err.response?.status === 401 || err.response?.status === 403) { window.location.href = '/login'; }
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
      callPeerEmailRef.current = activeChat; 
      
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
    if (!incomingCallDataRef.current) return;
    try {
      setIsVideoCall(incomingCallDataRef.current.isVideo); setCallState('in-call');
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
    const uniqueId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).substring(2); 
    const chatMessage = { localId: uniqueId, senderEmail: currentUser.email, recipientEmail: activeChat, content: newMessage.trim(), timestamp: timeString };
    stompClientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(chatMessage) });
    setMessages((prev) => [...prev, chatMessage]); 
    setNewMessage(''); 
    if (textareaRef.current) textareaRef.current.style.height = '48px';
    sendTypingStatus(false);
  };

  const sendTypingStatus = (isTyping) => { if (!stompClientRef.current || !stompClientRef.current.connected || !activeChatRef.current || !currentUserRef.current) return; stompClientRef.current.publish({ destination: '/app/chat.typing', body: JSON.stringify({ senderEmail: currentUserRef.current.email, recipientEmail: activeChatRef.current, isTyping: isTyping.toString() }) }); };
  
  const handleInputChange = (e) => { 
    e.target.style.height = '48px'; 
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

  if (!currentUser) return <div className="flex h-screen bg-slate-50 dark:bg-[#111313] items-center justify-center"><Loader2 size={48} className="text-[#0fa384] animate-spin" /></div>;

  const getToastBg = (type) => {
    if (type === 'error') return 'bg-rose-500';
    if (type === 'info') return 'bg-indigo-500';
    return 'bg-[#0fa384] text-white';
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#111313] transition-colors duration-300 font-sans relative overflow-hidden">
      <AnimatePresence>
        {!hasAcceptedTC && (
          <motion.div 
            initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(12px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
            className="absolute inset-0 z-[200] bg-black/60 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, rotateX: 10 }} animate={{ scale: 1, y: 0, rotateX: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white dark:bg-[#1a1f1d] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#323d38]"
            >
              <div className="p-8 text-center bg-gradient-to-b from-[#0fa384]/10 to-transparent">
                <div className="w-16 h-16 bg-[#0fa384]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#0fa384]/10">
                  <ShieldCheck size={32} className="text-[#0fa384]" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-display">Welcome to Neosis</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Please review our security and privacy guidelines.</p>
              </div>
              
              <div className="px-8 py-2 max-h-60 overflow-y-auto custom-scrollbar text-sm text-gray-600 dark:text-gray-300 space-y-4">
                <div className="flex gap-3 items-start">
                  <ShieldAlert size={20} className="text-[#0fa384] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">End-to-End Encryption</h3>
                    <p className="mt-1 leading-relaxed text-gray-500 dark:text-gray-400">All video and audio calls are secured via WebRTC DTLS-SRTP encryption.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <User size={20} className="text-[#0fa384] flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Data Privacy</h3>
                    <p className="mt-1 leading-relaxed text-gray-500 dark:text-gray-400">We do not sell your personal data. Your chat history is stored securely.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Ban size={20} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">Acceptable Use</h3>
                    <p className="mt-1 leading-relaxed text-gray-500 dark:text-gray-400">Harassment, spam, and illegal activities are strictly prohibited.</p>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 dark:bg-[#151817] mt-4 border-t border-gray-100 dark:border-[#232a28] flex flex-col gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} onClick={handleAcceptTerms}
                  className="w-full py-3.5 bg-[#0fa384] text-white font-bold rounded-xl hover:bg-[#0ba082] transition-colors shadow-lg shadow-[#0fa384]/20"
                >
                  I Accept & Agree
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {callState !== 'idle' && (
          <motion.div initial={{ opacity: 0, backdropFilter: "blur(0px)" }} animate={{ opacity: 1, backdropFilter: "blur(24px)" }} exit={{ opacity: 0, backdropFilter: "blur(0px)" }} className="absolute inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
            {callState === 'ringing' ? (
              <div className="flex flex-col items-center text-white">
                <motion.div animate={{ scale: [1, 1.1, 1], boxShadow: ["0px 0px 0px rgba(15,163,132,0)", "0px 0px 40px rgba(15,163,132,0.6)", "0px 0px 0px rgba(15,163,132,0)"] }} transition={{ repeat: Infinity, duration: 1.5 }} className={`w-32 h-32 rounded-full mb-6 flex items-center justify-center text-4xl font-bold bg-gradient-to-br ${getAvatarGradient(formatName(incomingCallData?.senderEmail))} shadow-2xl`}>{formatName(incomingCallData?.senderEmail).charAt(0)}</motion.div>
                <h2 className="text-3xl font-bold mb-2 font-display">{formatName(incomingCallData?.senderEmail)}</h2>
                <p className="text-gray-400 mb-12">{incomingCallData?.isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}</p>
                <div className="flex gap-8">
                  <motion.button aria-label="Reject Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleRejectCall} className="w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-rose-500/30 text-white"><PhoneOff size={28} /></motion.button>
                  <motion.button aria-label="Accept Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleAcceptCall} className="w-16 h-16 bg-[#0fa384] rounded-full flex items-center justify-center shadow-lg shadow-[#0fa384]/30 text-white"><PhoneCall size={28} /></motion.button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full p-4 flex flex-col relative max-w-6xl mx-auto">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex-1 relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-[#323d38] flex items-center justify-center">
                  {isVideoCall ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-48 h-48 rounded-full flex items-center justify-center text-6xl font-bold bg-gradient-to-br ${getAvatarGradient(formatName(callPeerEmailRef.current))} shadow-2xl`}>{formatName(callPeerEmailRef.current).charAt(0)}</motion.div>
                  )}
                  {isVideoCall && (
                    <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-[#151817] rounded-xl overflow-hidden shadow-2xl border-2 border-[#232a28]">
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
          <motion.div initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className={`absolute top-8 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full text-sm font-semibold shadow-2xl flex items-center gap-2 ${getToastBg(toast.type)}`}>
            {toast.type === 'success' && <Check size={16} />}
            {toast.type === 'info' && <Info size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={pageTransition} initial="hidden" animate="show" className={`w-full h-full flex z-10 ${!hasAcceptedTC ? 'pointer-events-none blur-sm' : ''}`}>
        
        <div className={`${activeChat ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] bg-slate-50 dark:bg-[#1a1f1d] flex-col flex-shrink-0 z-20 border-r border-gray-200 dark:border-[#232a28] transition-colors duration-300`}>
          <div className="p-4 flex justify-between items-center transition-colors duration-300 border-b border-gray-200 dark:border-[#232a28]">
            <div className="flex items-center gap-3">
              <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="w-9 h-9 bg-[#0fa384]/10 rounded-lg flex items-center justify-center border border-[#0fa384]/20"><ShieldCheck size={18} className="text-[#0fa384]" /></motion.div>
              <div><h2 className="text-base font-bold text-gray-900 dark:text-white tracking-wide font-display">NEOSIS</h2></div>
            </div>
            <div className="flex items-center gap-1">
              <motion.button aria-label="Toggle Dark Mode" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#0fa384] dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</motion.button>
              
              <div className="relative">
                <motion.button aria-label="Notifications" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#0fa384] dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors">
                  <Bell size={18} />{pendingRequests.length > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#1a1f1d]"></motion.span>}
                </motion.button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute top-12 right-0 w-80 bg-white dark:bg-[#151817] rounded-xl shadow-2xl border border-gray-200 dark:border-[#323d38] z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-[#232a28] text-sm font-bold flex justify-between items-center text-gray-900 dark:text-white"><span>Friend Requests</span><span className="bg-[#0fa384]/10 text-[#0fa384] text-xs px-2.5 py-1 rounded-full">{pendingRequests.length}</span></div>
                      {pendingRequests.length === 0 ? <div className="p-8 text-sm text-gray-500 dark:text-gray-400 text-center">No pending requests</div> : (
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          {pendingRequests.map(req => (
                            <div key={req.id} className="p-4 border-b border-gray-100 dark:border-[#232a28]/50 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition">
                              <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate w-2/3">{formatName(req.senderEmail)}</span>
                              <motion.button aria-label="Accept Request" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleAcceptRequest(req.id)} className="bg-[#0fa384] text-white p-2 rounded-lg hover:bg-[#0ba082] transition-colors"><Check size={16}/></motion.button>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative">
                <motion.button aria-label="Settings" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowSettingsMenu(!showSettingsMenu)} className="p-2 text-gray-500 dark:text-gray-400 hover:text-[#0fa384] dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors">
                  <Settings size={18} />
                </motion.button>
                <AnimatePresence>
                  {showSettingsMenu && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 top-12 w-56 bg-white dark:bg-[#151817] rounded-xl shadow-2xl border border-gray-200 dark:border-[#323d38] z-50 overflow-hidden">
                      <div className="p-4 border-b border-gray-200 dark:border-[#232a28] text-sm font-bold text-gray-900 dark:text-white">Settings</div>
                      <div className="flex flex-col text-sm text-gray-700 dark:text-gray-300">
                        <button onClick={() => { setShowSettingsMenu(false); showToast("Account preferences coming soon", "info"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><UserCog size={16} /> Account</button>
                        <button onClick={() => { setShowSettingsMenu(false); showToast("Privacy settings coming soon", "info"); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><Shield size={16} /> Privacy</button>
                        <div className="h-px bg-gray-200 dark:bg-[#232a28] w-full"></div>
                        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 dark:hover:bg-[#232a28] text-rose-500 transition w-full text-left font-semibold"><LogOut size={16} /> Log Out</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="px-4 py-4 border-b border-gray-200 dark:border-[#232a28]">
            <form onSubmit={handleSendRequest} className="relative flex items-center">
              <Search size={18} className="absolute left-3 text-gray-400 dark:text-[#0fa384]" />
              <input type="email" value={addEmailInput} onChange={(e) => setAddEmailInput(e.target.value)} placeholder="Search contacts..." className="w-full bg-white dark:bg-[#111313] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none focus:border-[#0fa384] transition-colors border border-gray-300 dark:border-[#323d38] shadow-sm dark:shadow-none" required />
              <button aria-label="Add Contact" type="submit" className="absolute right-2 text-gray-400 dark:text-[#0fa384] p-1 hover:bg-gray-100 dark:hover:bg-[#232a28] rounded-md transition-colors"><UserPlus size={18}/></button>
            </form>
          </div>

          <motion.div variants={listVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto custom-scrollbar contain-content">
            {friends.map(friend => {
              const fName = formatName(friend);
              const isActive = activeChat === friend;
              return (
                <motion.div variants={itemVariants} key={friend} onClick={() => handleOpenChat(friend)} className={`relative flex items-center gap-3.5 p-4 cursor-pointer transition-all duration-150 ${isActive ? 'bg-gray-100 dark:bg-[#1f2422]' : 'hover:bg-gray-50 dark:hover:bg-[#151817]'}`}>
                  {isActive && <motion.div layoutId="activeIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-[#0fa384]" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(fName)} rounded-full flex items-center justify-center text-white font-bold text-lg`}>{fName.charAt(0).toUpperCase()}</div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#0fa384] rounded-full border-2 border-white dark:border-[#1a1f1d] transition-colors duration-300"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5"><div className="font-medium text-gray-900 dark:text-gray-100 truncate text-[15px]">{fName}</div></div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">Tap to view conversation...</div>
                      {unreadCounts[friend] > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-[#ff8f24] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unreadCounts[friend]}</motion.div>}
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {friends.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 flex flex-col items-center justify-center text-gray-500 text-center px-6">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="w-16 h-16 bg-white dark:bg-[#151817] shadow-sm dark:shadow-none rounded-2xl flex items-center justify-center mb-4 transition-colors"><UserPlus size={24} className="text-gray-400 dark:text-[#0fa384]" /></motion.div>
                <h3 className="text-gray-900 dark:text-gray-200 font-medium mb-1 font-display">No chats yet</h3>
                <p className="text-xs leading-relaxed dark:text-gray-500">Search for a friend's email above to start a secure conversation.</p>
              </motion.div>
            )}
          </motion.div>
        </div>

        <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white dark:bg-[#111313] relative transition-colors duration-300`}>
          {!activeChat ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center relative z-10 text-gray-500 dark:text-gray-400">
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-24 h-24 bg-gray-50 dark:bg-[#1a1f1d] rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 dark:border-[#232a28]"><MessageSquare size={40} className="text-gray-400 dark:text-[#0fa384]" /></motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-display">Neosis Web</h2>
              <p className="text-sm max-w-sm text-center leading-relaxed">Select a contact from the sidebar to start a secure, end-to-end encrypted conversation.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col h-full relative z-10">
              <div className="px-6 py-4 bg-white dark:bg-[#1a1f1d] border-b border-gray-200 dark:border-[#232a28] flex items-center justify-between z-20 transition-colors">
                <div className="flex items-center gap-4">
                  <motion.button aria-label="Go Back" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setActiveChat(null)} className="md:hidden text-gray-400 dark:hover:text-white transition"><ArrowLeft size={24} /></motion.button>
                  <div className="relative">
                    <div className={`w-11 h-11 bg-gradient-to-br ${getAvatarGradient(formatName(activeChat))} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm`}>{formatName(activeChat).charAt(0).toUpperCase()}</div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#0fa384] rounded-full border-2 border-white dark:border-[#1a1f1d] transition-colors"></div>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 dark:text-white text-[16px]">{formatName(activeChat)}</div>
                    <div className="text-[12px] font-medium text-[#0fa384] flex items-center gap-1.5 mt-0.5">{isRemoteTyping ? <span className="italic animate-pulse">typing...</span> : "Online"}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-400">
                  <motion.button aria-label="Audio Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStartCall(false)} className="p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors"><Phone size={20}/></motion.button>
                  <motion.button aria-label="Video Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStartCall(true)} className="p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors"><Video size={22}/></motion.button>
                  <div className="w-px h-6 bg-gray-200 dark:bg-[#323d38] mx-2 transition-colors"></div>
                  <motion.button aria-label="Search Chat" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setIsSearching(!isSearching); setSearchQuery(''); }} className={`p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors ${isSearching ? 'text-[#0fa384] bg-[#0fa384]/10' : ''}`}><Search size={20}/></motion.button>
                  <motion.button aria-label="Menu" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors"><MoreVertical size={20}/></motion.button>
                </div>
              </div>

              <AnimatePresence>
                {isSearching && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-gray-50 dark:bg-[#1a1f1d] border-b border-gray-200 dark:border-[#232a28] overflow-hidden z-10 transition-colors">
                    <div className="px-6 py-3 flex items-center gap-3">
                      <Search size={16} className="text-gray-400 dark:text-[#0fa384]" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search and filter this chat..." className="flex-1 bg-transparent text-sm outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" autoFocus />
                      <button aria-label="Close Search" onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-gray-400 hover:text-rose-500 transition-colors p-1"><X size={16} /></button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5 bg-white dark:bg-[#111313] transition-colors">
                {isChatLoading ? <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-[#0fa384]" size={32} /></div> : (
                  <AnimatePresence>
                    {displayedMessages.map((msg, index) => {
                      const isMe = msg.senderEmail === currentUser.email;
                      const rawContent = msg.content;
                      const messageKey = msg.id || msg.localId || `${index}-${msg.timestamp}`;
                      const isPending = isMe && !msg.id; 
                      
                      return (
                        <motion.div layout variants={messageVariants} initial="hidden" animate="show" key={messageKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`px-4 py-2.5 text-[15px] leading-relaxed shadow-sm break-words ${isMe ? 'bg-[#0fa384] text-white rounded-2xl rounded-br-sm' : 'bg-gray-100 dark:bg-[#232a28] text-gray-900 dark:text-gray-200 rounded-2xl rounded-tl-sm transition-colors'}`}>
                              {isSearching && searchQuery ? highlightText(rawContent, searchQuery) : rawContent}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium px-1 flex items-center gap-1 font-mono">
                              {msg.timestamp || 'Just now'} 
                              {isMe && (isPending ? <Check size={12} className="text-gray-300" /> : <CheckCheck size={14} className="text-[#0fa384] dark:text-[#0fa384]" />)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                    {isRemoteTyping && <motion.div layout initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: "spring" }} className="flex justify-start"><div className="bg-gray-100 dark:bg-[#232a28] transition-colors rounded-2xl rounded-tl-sm px-4 py-3.5 flex items-center gap-1.5 w-16 shadow-sm"><motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#0fa384] rounded-full" /><motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#0fa384] rounded-full" /><motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} className="w-1.5 h-1.5 bg-gray-400 dark:bg-[#0fa384] rounded-full" /></div></motion.div>}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} className="h-4" />
              </div>

              <div className="p-4 bg-white dark:bg-[#1a1f1d] border-t border-gray-200 dark:border-[#232a28] z-20 transition-colors">
                <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-5xl mx-auto w-full">
                  <div className="flex items-center gap-1 pb-1.5">
                    <button type="button" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors"><Paperclip size={20}/></button>
                    <button type="button" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors"><Smile size={20}/></button>
                    <button type="button" className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors"><Mic size={20}/></button>
                  </div>
                  <textarea ref={textareaRef} value={newMessage} onChange={handleInputChange} maxLength={5000} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} placeholder="Type a message..." className="flex-1 bg-gray-50 dark:bg-[#151817] text-gray-900 dark:text-white border border-gray-300 dark:border-[#323d38] focus:border-[#0fa384] dark:focus:border-[#0fa384] rounded-xl px-4 py-3 placeholder-gray-400 dark:placeholder-gray-500 text-[15px] resize-none custom-scrollbar outline-none transition-all focus:shadow-[0_0_10px_rgba(15,163,132,0.15)]" rows="1" />
                  <button type="submit" className="bg-[#0fa384] hover:bg-[#0ba082] text-white p-3 rounded-xl shadow-lg transition-colors flex-shrink-0 mb-0.5"><Send size={20}/></button>
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