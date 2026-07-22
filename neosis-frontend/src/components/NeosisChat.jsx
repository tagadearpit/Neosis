import React, { useState, useEffect, useRef, useCallback, useMemo, useContext, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, UserPlus, Bell, Send, Check, CheckCheck, ArrowLeft, Moon, Sun, 
  Loader2, Phone, Video, Search, MoreVertical, Paperclip, Smile, Mic, ShieldCheck,
  X, User, Trash2, Ban, PhoneOff, PhoneCall, ShieldAlert, Info, Settings, LogOut, UserCog, Shield,
  FileText, Pin, BellOff, BellRing, UserMinus, Clock3
} from 'lucide-react';
import SockJS from 'sockjs-client';
import { Client, ReconnectionTimeMode } from '@stomp/stompjs';
import api, { BACKEND_URL, getApiErrorMessage } from '../api';
import { AuthContext } from '../context/AuthContext';
import SettingsModal from './SettingsModal';
import ConfirmDialog from './ConfirmDialog';
import ContactInfoModal from './ContactInfoModal';

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
      <span key={i} className="neosis-accent-soft rounded px-0.5">{part}</span>
    ) : part
  );
};

const resolveMediaUrl = (url) => {
  if (!url) return '';
  return url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
};

const firstSafeLink = (text) => {
  const match = typeof text === 'string' ? text.match(/https?:\/\/[^\s<>{}\[\]"]+/i) : null;
  if (!match) return null;
  try {
    const url = new URL(match[0]);
    return ['http:', 'https:'].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
};

const formatMessageTime = (message) => {
  const value = message?.timestamp || message?.createdAt;
  if (!value) return 'Just now';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return value;
};


const getContactEmail = (contact) => typeof contact === 'string' ? contact : contact?.email;
const getContactName = (contact) => contact?.name || formatName(getContactEmail(contact));
const sortContacts = (contacts) => [...contacts].sort((a, b) => {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
  return getContactName(a).localeCompare(getContactName(b), undefined, { sensitivity: 'base' });
});

const playNotificationTone = (sound = 'CHIME') => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const soft = sound === 'SOFT';
    oscillator.frequency.value = soft ? 440 : 660;
    oscillator.type = soft ? 'sine' : 'triangle';
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(soft ? 0.035 : 0.08, context.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + (soft ? 0.2 : 0.12));
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + (soft ? 0.21 : 0.13));
    oscillator.addEventListener('ended', () => context.close());
  } catch {
    // Browsers can block programmatic audio before user interaction.
  }
};

const isDoNotDisturbActive = (notifications) => {
  const start = notifications?.doNotDisturbStart;
  const end = notifications?.doNotDisturbEnd;
  if (!start || !end) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const toMinutes = (value) => {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const startMinutes = toMinutes(start);
  const endMinutes = toMinutes(end);
  return startMinutes <= endMinutes
    ? currentMinutes >= startMinutes && currentMinutes < endMinutes
    : currentMinutes >= startMinutes || currentMinutes < endMinutes;
};

const themeIsDark = (theme) => theme === 'DARK' || (
  theme === 'SYSTEM' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
);

const EMOJI_LIST = ["😀","😂","🤣","😊","🥰","😍","😒","😘","💕","😁","👍","🙌","✌️","✨","🔥","🎉","💯","💔","❤️","🥺","😎","🤔","🙄","😴","🤐","🤢","🤧","😷","🤯","🤠","🥳","🤫","🤭","🧐","🤓","😈","💀","👻","👽","🤖","👋","🤚","🖐","✋","🖖","👌","🤏","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦵","🦿","🦶","👣","👂","🦻","👃","🦼","🧠","🦷","🦴","👀","👁","👅","👄","💋","🩸"];

const optionalTurnServer = import.meta.env.VITE_TURN_URL ? [{
  urls: import.meta.env.VITE_TURN_URL,
  username: import.meta.env.VITE_TURN_USERNAME || undefined,
  credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined
}] : [];

const rtcConfiguration = {
  iceServers: [ 
    { urls: 'stun:stun.l.google.com:19302' }, 
    { urls: 'stun:stun1.l.google.com:19302' },
    ...optionalTurnServer
  ]
};

const listVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
const messageVariants = { hidden: { opacity: 0, y: 20, scale: 0.95, rotateX: -15, filter: "blur(5px)" }, show: { opacity: 1, y: 0, scale: 1, rotateX: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 280, damping: 22 } } };
const pageTransition = { hidden: { opacity: 0, scale: 0.98 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" } } };

function NeosisChatInner() {
  const { user: authUser, setUser: setAuthUser, clearSession } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState(authUser);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('account');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [addEmailInput, setAddEmailInput] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [themePreference, setThemePreference] = useState(() => localStorage.getItem('themePreference') || 'SYSTEM');
  const [isDarkMode, setIsDarkMode] = useState(() => themeIsDark(localStorage.getItem('themePreference') || 'SYSTEM'));
  const [expiryTick, setExpiryTick] = useState(0);
  
  const [hasAcceptedTC, setHasAcceptedTC] = useState(false);

  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [isSending, setIsSending] = useState(false); 
  const [revealedMedia, setRevealedMedia] = useState(() => new Set());
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const isRecordingRef = useRef(false); 
  const startTimeRef = useRef(null);

  const [callState, setCallState] = useState('idle'); 
  const [incomingCallData, setIncomingCallData] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);

  const typingTimeoutRef = useRef(null);
  const remoteTypingTimeoutRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const stompClientRef = useRef(null);
  const messagesEndRef = useRef(null); 
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null); 
  
  const activeChatRef = useRef(activeChat);
  const currentUserRef = useRef(currentUser);
  const friendsRef = useRef(friends);
  const historyAbortRef = useRef(null);
  const realtimeErrorShownRef = useRef(false);
  const loginNoticeShownRef = useRef(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  
  const callPeerEmailRef = useRef(null);
  const callStateRef = useRef(callState);
  const incomingCallDataRef = useRef(incomingCallData);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { incomingCallDataRef.current = incomingCallData; }, [incomingCallData]);
  useEffect(() => { friendsRef.current = friends; }, [friends]);

  const iceCandidateQueueRef = useRef([]);

  useEffect(() => { activeChatRef.current = activeChat; }, [activeChat]);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => {
    if (authUser) setCurrentUser(authUser);
  }, [authUser]);
  useEffect(() => {
    const savedTheme = currentUser?.settings?.appearance?.theme;
    if (savedTheme) setThemePreference(savedTheme);
  }, [currentUser?.settings?.appearance?.theme]);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const applyTheme = () => setIsDarkMode(themeIsDark(themePreference));
    applyTheme();
    localStorage.setItem('themePreference', themePreference);
    media?.addEventListener('change', applyTheme);
    return () => media?.removeEventListener('change', applyTheme);
  }, [themePreference]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    const appearance = currentUser?.settings?.appearance;
    document.documentElement.style.setProperty('--neosis-accent', appearance?.accentColor || '#0fa384');
    document.documentElement.style.setProperty('--color-primary', appearance?.accentColor || '#0fa384');
    document.documentElement.dataset.fontSize = appearance?.fontSize || 'MEDIUM';
    document.documentElement.dataset.compact = appearance?.compactMode ? 'true' : 'false';
  }, [isDarkMode, currentUser?.settings?.appearance]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  useEffect(() => {
    if (callState !== 'in-call') return;
    if (localVideoRef.current && localStreamRef.current) localVideoRef.current.srcObject = localStreamRef.current;
    if (isVideoCall && remoteVideoRef.current && remoteStreamRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    if (!isVideoCall && remoteAudioRef.current && remoteStreamRef.current) remoteAudioRef.current.srcObject = remoteStreamRef.current;
  }, [callState, isVideoCall]);

  const fetchSidebarData = useCallback(async () => {
    try {
      const [conversationsRes, pendingRes] = await Promise.all([
        api.get('/api/conversations'),
        api.get('/api/contacts/pending')
      ]);
      const conversations = Array.isArray(conversationsRes.data) ? sortContacts(conversationsRes.data) : [];
      setFriends(conversations);
      setPendingRequests(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      setUnreadCounts(Object.fromEntries(conversations.map(contact => [contact.email, Number(contact.unreadCount || 0)])));
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to load conversations', error);
    }
  }, []);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    if (currentUser?.newDeviceLogin && !loginNoticeShownRef.current) {
      loginNoticeShownRef.current = true;
      showToast('New device sign-in recorded. Review Active sessions if this was not you.', 'info');
    }
  }, [currentUser?.newDeviceLogin, showToast]);

  const handleAcceptTerms = async () => {
    try {
      await api.post('/api/users/accept-terms', {});
      setHasAcceptedTC(true);
      const updatedUser = { ...currentUserRef.current, termsAccepted: true };
      setCurrentUser(updatedUser);
      setAuthUser(updatedUser);
      showToast("Welcome to Neosis!", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error, "Could not record terms acceptance."), "error");
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/logout', null);
    } catch {
      // The client still clears its local authentication state if the server is unavailable.
    } finally {
      clearSession();
      window.location.replace('/login');
    }
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
    remoteStreamRef.current = null;
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

  const markConversationRead = useCallback(async (friendEmail) => {
    if (!friendEmail) return;
    try {
      const response = await api.post(`/api/messages/read/${encodeURIComponent(friendEmail)}`, {});
      const readAt = response.data?.readAt;
      setUnreadCounts((previous) => ({ ...previous, [friendEmail]: 0 }));
      setFriends((previous) => previous.map((contact) => contact.email === friendEmail ? { ...contact, unreadCount: 0 } : contact));
      if (readAt) {
        setMessages((previous) => previous.map((message) => (
          message.senderEmail === friendEmail && message.recipientEmail === currentUserRef.current?.email
            ? { ...message, readAt: message.readAt || readAt }
            : message
        )));
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to mark conversation as read', error);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (stompClientRef.current?.active) stompClientRef.current.deactivate();

    const client = new Client({
      webSocketFactory: () => new SockJS(`${BACKEND_URL}/ws`, null, { withCredentials: true }),
      reconnectDelay: 1_000,
      reconnectTimeMode: ReconnectionTimeMode.EXPONENTIAL,
      maxReconnectDelay: 30_000,
      connectionTimeout: 20_000,
      discardWebsocketOnCommFailure: true,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setIsRealtimeConnected(true);
        realtimeErrorShownRef.current = false;

        client.subscribe('/user/queue/messages', (frame) => {
          try {
            const incomingMessage = JSON.parse(frame.body);
            const currentEmail = currentUserRef.current?.email;
            const selectedEmail = activeChatRef.current;
            const belongsToSelectedConversation = Boolean(selectedEmail) && (
              (incomingMessage.senderEmail === currentEmail && incomingMessage.recipientEmail === selectedEmail) ||
              (incomingMessage.senderEmail === selectedEmail && incomingMessage.recipientEmail === currentEmail)
            );

            if (belongsToSelectedConversation) {
              setMessages((previous) => {
                if (incomingMessage.localId) {
                  const localIndex = previous.findIndex((item) => item.localId === incomingMessage.localId);
                  if (localIndex !== -1) {
                    const next = [...previous];
                    next[localIndex] = incomingMessage;
                    return next;
                  }
                }
                const duplicate = previous.some((item) =>
                  (item.id && incomingMessage.id && item.id === incomingMessage.id) ||
                  (item.localId && incomingMessage.localId && item.localId === incomingMessage.localId)
                );
                return duplicate ? previous : [...previous, incomingMessage];
              });

              if (incomingMessage.senderEmail === selectedEmail) markConversationRead(selectedEmail);
            } else if (incomingMessage.senderEmail !== currentEmail) {
              setUnreadCounts((previous) => ({
                ...previous,
                [incomingMessage.senderEmail]: (previous[incomingMessage.senderEmail] || 0) + 1
              }));
              setFriends((previous) => previous.map((contact) => contact.email === incomingMessage.senderEmail
                ? { ...contact, unreadCount: Number(contact.unreadCount || 0) + 1 }
                : contact
              ));

              const senderContact = friendsRef.current.find((contact) => contact.email === incomingMessage.senderEmail);
              const notificationSettings = currentUserRef.current?.settings?.notifications;
              const notificationsAllowed = notificationSettings?.messageNotifications !== false
                && !isDoNotDisturbActive(notificationSettings)
                && !senderContact?.muted;
              if (notificationsAllowed && notificationSettings?.sound !== 'NONE') playNotificationTone(notificationSettings?.sound);
              if (notificationsAllowed && notificationSettings?.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
                const preview = notificationSettings.preview;
                const title = preview === 'HIDDEN'
                  ? 'Neosis'
                  : getContactName(senderContact || incomingMessage.senderEmail);
                const body = preview === 'HIDDEN'
                  ? 'New message'
                  : (preview === 'SENDER' ? 'New message received' : (incomingMessage.content || 'Sent an attachment'));
                new Notification(title, {
                  body,
                  tag: `neosis-${incomingMessage.senderEmail}`
                });
              }
            }

            setIsRemoteTyping(false);
            if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
          } catch (error) {
            if (import.meta.env.DEV) console.error('Invalid message frame', error);
          }
        });

        client.subscribe('/user/queue/receipts', (frame) => {
          try {
            const receipt = JSON.parse(frame.body);
            if (!receipt.readerEmail || !receipt.readAt) return;
            setMessages((previous) => previous.map((message) => (
              message.senderEmail === currentUserRef.current?.email && message.recipientEmail === receipt.readerEmail
                ? { ...message, readAt: message.readAt || receipt.readAt }
                : message
            )));
          } catch (error) {
            if (import.meta.env.DEV) console.error('Invalid read receipt frame', error);
          }
        });

        client.subscribe('/user/queue/typing', (frame) => {
          try {
            const data = JSON.parse(frame.body);
            if (data.senderEmail === activeChatRef.current) {
              setIsRemoteTyping(data.isTyping === 'true');
              if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
              if (data.isTyping === 'true') {
                remoteTypingTimeoutRef.current = setTimeout(() => setIsRemoteTyping(false), 3000);
              }
            }
          } catch (error) {
            if (import.meta.env.DEV) console.error('Invalid typing frame', error);
          }
        });

        client.subscribe('/user/queue/signaling', async (frame) => {
          try {
            const data = JSON.parse(frame.body);
            if (data.type === 'offer') {
              if (!friendsRef.current.some((contact) => contact.email === data.senderEmail)) return;
              if (callStateRef.current !== 'idle') {
                client.publish({ destination: '/app/chat.signal', body: JSON.stringify({ type: 'call-rejected', reason: 'busy', recipientEmail: data.senderEmail }) });
                return;
              }
              callPeerEmailRef.current = data.senderEmail;
              setIncomingCallData(data);
              setCallState('ringing');
            } else if (data.type === 'answer' && peerConnectionRef.current?.signalingState !== 'closed') {
              await peerConnectionRef.current.setRemoteDescription(data.sdp);
              while (iceCandidateQueueRef.current.length > 0 && peerConnectionRef.current?.signalingState !== 'closed') {
                await peerConnectionRef.current.addIceCandidate(iceCandidateQueueRef.current.shift());
              }
            } else if (data.type === 'ice-candidate') {
              const connection = peerConnectionRef.current;
              if (!connection || connection.signalingState === 'closed') return;
              const candidate = new RTCIceCandidate(data.candidate);
              if (connection.remoteDescription?.type) await connection.addIceCandidate(candidate);
              else if (iceCandidateQueueRef.current.length < 50) iceCandidateQueueRef.current.push(candidate);
            } else if (data.type === 'end-call') {
              cleanupCallResources();
            } else if (data.type === 'call-rejected') {
              showToast(data.reason === 'busy' ? 'Contact is currently busy.' : 'Call declined.', 'info');
              cleanupCallResources();
            }
          } catch (error) {
            if (import.meta.env.DEV) console.error('Signaling failure', error);
            cleanupCallResources();
          }
        });

        client.subscribe('/user/queue/notifications', () => fetchSidebarData());
      },
      onDisconnect: () => setIsRealtimeConnected(false),
      onStompError: () => {
        setIsRealtimeConnected(false);
        if (!realtimeErrorShownRef.current) {
          realtimeErrorShownRef.current = true;
          showToast('Realtime connection interrupted. Reconnecting...', 'info');
        }
      },
      onWebSocketClose: () => setIsRealtimeConnected(false),
      onWebSocketError: () => setIsRealtimeConnected(false)
    });

    client.activate();
    stompClientRef.current = client;
  }, [cleanupCallResources, fetchSidebarData, markConversationRead, showToast]);

  useEffect(() => {
    if (!authUser?.email || !hasAcceptedTC) return undefined;

    connectWebSocket();
    fetchSidebarData();

    return () => {
      historyAbortRef.current?.abort();
      if (stompClientRef.current) stompClientRef.current.deactivate();
      setIsRealtimeConnected(false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      cleanupCallResources();

      if (isRecordingRef.current && mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [authUser?.email, hasAcceptedTC, fetchSidebarData, connectWebSocket, cleanupCallResources]);

  useEffect(() => {
    if (!authUser?.email || !hasAcceptedTC) return undefined;
    const heartbeat = () => api.post('/api/users/presence', {}).catch(() => {});
    heartbeat();
    const timer = window.setInterval(heartbeat, 60_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') heartbeat();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [authUser?.email, hasAcceptedTC]);

  useEffect(() => {
    if (!messages.some((message) => message.expiresAt)) return undefined;
    const timer = window.setInterval(() => setExpiryTick((value) => value + 1), 30_000);
    return () => window.clearInterval(timer);
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: isChatLoading ? 'auto' : 'smooth' });
  }, [messages.length, activeChat, isChatLoading]);

  const sendWebRTCSignal = useCallback((payload) => {
    if (!stompClientRef.current?.connected) return false;
    stompClientRef.current.publish({ destination: '/app/chat.signal', body: JSON.stringify(payload) });
    return true;
  }, []);

  const configurePeerConnection = useCallback((connection, recipientEmail, videoEnabled) => {
    connection.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;
      if (videoEnabled && remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      if (!videoEnabled && remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
    };
    connection.onicecandidate = (event) => {
      if (event.candidate) sendWebRTCSignal({ type: 'ice-candidate', candidate: event.candidate, recipientEmail });
    };
    connection.onconnectionstatechange = () => {
      if (['failed', 'closed'].includes(connection.connectionState)) cleanupCallResources();
      if (connection.connectionState === 'disconnected') {
        showToast('Call connection interrupted.', 'info');
      }
    };
  }, [cleanupCallResources, sendWebRTCSignal, showToast]);

  const handleStartCall = async (video = true) => {
    const recipientEmail = activeChatRef.current;
    if (!recipientEmail || callStateRef.current !== 'idle') return;
    if (activeContact?.canMessage === false) {
      showToast('This contact is not accepting messages or calls.', 'info');
      return;
    }
    if (!isRealtimeConnected) {
      showToast('Realtime connection is unavailable.', 'error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      showToast('Media devices are not supported by this browser.', 'error');
      return;
    }

    try {
      setIsVideoCall(video);
      setCallState('in-call');
      callPeerEmailRef.current = recipientEmail;
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      localStreamRef.current = stream;

      const connection = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = connection;
      configurePeerConnection(connection, recipientEmail, video);
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      if (video && localVideoRef.current) localVideoRef.current.srcObject = stream;

      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendWebRTCSignal({ type: 'offer', sdp: offer, recipientEmail, isVideo: video });
    } catch (error) {
      cleanupCallResources();
      showToast(error?.name === 'NotAllowedError' ? 'Camera or microphone permission was denied.' : 'Could not start the call.', 'error');
    }
  };

  const handleAcceptCall = async () => {
    const incoming = incomingCallDataRef.current;
    if (!incoming || !navigator.mediaDevices?.getUserMedia) return;
    const { senderEmail, isVideo, sdp } = incoming;

    try {
      setIsVideoCall(Boolean(isVideo));
      setCallState('in-call');
      callPeerEmailRef.current = senderEmail;
      const stream = await navigator.mediaDevices.getUserMedia({ video: Boolean(isVideo), audio: true });
      localStreamRef.current = stream;

      const connection = new RTCPeerConnection(rtcConfiguration);
      peerConnectionRef.current = connection;
      configurePeerConnection(connection, senderEmail, Boolean(isVideo));
      stream.getTracks().forEach((track) => connection.addTrack(track, stream));
      if (isVideo && localVideoRef.current) localVideoRef.current.srcObject = stream;

      await connection.setRemoteDescription(sdp);
      while (iceCandidateQueueRef.current.length > 0 && connection.signalingState !== 'closed') {
        await connection.addIceCandidate(iceCandidateQueueRef.current.shift());
      }
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      sendWebRTCSignal({ type: 'answer', sdp: answer, recipientEmail: senderEmail });
    } catch (error) {
      sendWebRTCSignal({ type: 'call-rejected', reason: 'media-unavailable', recipientEmail: senderEmail });
      cleanupCallResources();
      showToast(error?.name === 'NotAllowedError' ? 'Camera or microphone permission was denied.' : 'Could not accept the call.', 'error');
    }
  };

  const handleRejectCall = () => {
    const senderEmail = incomingCallDataRef.current?.senderEmail;
    if (senderEmail) sendWebRTCSignal({ type: 'call-rejected', reason: 'declined', recipientEmail: senderEmail });
    cleanupCallResources();
  };

  const handleSendRequest = async (event) => {
    event.preventDefault();
    const email = addEmailInput.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Enter a valid email address.', 'error');
      return;
    }
    if (email === currentUserRef.current?.email?.toLowerCase()) {
      showToast('You cannot add your own account.', 'error');
      return;
    }
    try {
      const response = await api.post('/api/contacts/request', null, { params: { receiverEmail: email } });
      setAddEmailInput('');
      showToast(response.data?.message || 'Contact request sent.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to send the contact request.'), 'error');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      const response = await api.post('/api/contacts/accept', null, { params: { requestId } });
      await fetchSidebarData();
      showToast(response.data?.message || 'Contact request accepted.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to accept the contact request.'), 'error');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      const response = await api.post('/api/contacts/reject', null, { params: { requestId } });
      await fetchSidebarData();
      showToast(response.data?.message || 'Contact request rejected.', 'info');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to reject the contact request.'), 'error');
    }
  };

  const handleOpenChat = async (contactOrEmail) => {
    const friendEmail = getContactEmail(contactOrEmail);
    if (!friendEmail) return;
    historyAbortRef.current?.abort();
    const controller = new AbortController();
    historyAbortRef.current = controller;

    setActiveChat(friendEmail);
    setMessages([]);
    setUnreadCounts((previous) => ({ ...previous, [friendEmail]: 0 }));
    setIsRemoteTyping(false);
    setShowEmojiPicker(false);
    setAttachment(null);
    setAttachmentPreview(null);
    setIsChatLoading(true);
    setIsSearching(false);
    setSearchQuery('');
    setShowMoreMenu(false);
    if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);

    try {
      const historyRes = await api.get(`/api/messages/history/${encodeURIComponent(friendEmail)}`, {
        params: { limit: 100 },
        signal: controller.signal
      });
      setMessages(Array.isArray(historyRes.data) ? historyRes.data : []);
      await markConversationRead(friendEmail);
    } catch (error) {
      if (error?.code !== 'ERR_CANCELED' && error?.name !== 'CanceledError') {
        showToast(getApiErrorMessage(error, 'Failed to load chat history.'), 'error');
      }
    } finally {
      if (historyAbortRef.current === controller) setIsChatLoading(false);
    }
  };

  const onEmojiClick = (emoji) => {
    setNewMessage(prev => prev + emoji);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (file.size > 15 * 1024 * 1024) {
      showToast('File too large. Maximum size is 15 MB.', 'error');
      e.target.value = '';
      return;
    }
    
    setAttachment(file);
    setShowEmojiPicker(false); 
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setAttachmentPreview(e.target.result);
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
      setAttachmentPreview('VIDEO');
    } else {
      setAttachmentPreview('DOCUMENT');
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startRecording = async () => {
    if (isRecordingRef.current || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      if (typeof MediaRecorder === 'undefined') showToast('Audio recording is not supported by this browser.', 'error');
      return;
    }

    let stream;
    try {
      const recipientAtRecordStart = activeChatRef.current;
      if (!recipientAtRecordStart) return;
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const supportedMimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = supportedMimeType ? new MediaRecorder(stream, { mimeType: supportedMimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onerror = () => showToast('The voice recording failed.', 'error');
      recorder.onstop = async () => {
        const durationMs = Date.now() - startTimeRef.current;
        const mimeType = recorder.mimeType || supportedMimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream?.getTracks().forEach((track) => track.stop());
        if (audioBlob.size === 0 || durationMs < 500) {
          showToast('Recording is too short or empty.', 'error');
          return;
        }
        if (audioBlob.size > 15 * 1024 * 1024) {
          showToast('Recording exceeds the 15 MB upload limit.', 'error');
          return;
        }

        try {
          const formData = new FormData();
          const fileExtension = mimeType.includes('mp4') ? 'm4a' : 'webm';
          formData.append('file', audioBlob, `voice-note.${fileExtension}`);
          formData.append('recipientEmail', recipientAtRecordStart);
          const uploadRes = await api.post('/api/chat/upload', formData);
          if (!sendRichMessage('', 'AUDIO', uploadRes.data.url, recipientAtRecordStart, uploadRes.data.filename)) {
            showToast('Realtime connection is unavailable. Voice note was not sent.', 'error');
          }
        } catch (error) {
          showToast(getApiErrorMessage(error, 'Failed to upload the voice note.'), 'error');
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      isRecordingRef.current = true;
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((previous) => {
          if (previous + 1 >= 30) {
            setTimeout(() => stopRecording(), 0);
            return 30;
          }
          return previous + 1;
        });
      }, 1000);
    } catch (error) {
      stream?.getTracks().forEach((track) => track.stop());
      isRecordingRef.current = false;
      setIsRecording(false);
      showToast(error?.name === 'NotAllowedError' ? 'Microphone permission was denied.' : 'Could not start recording.', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecordingRef.current) {
      mediaRecorderRef.current.stop();
      isRecordingRef.current = false;
      setIsRecording(false);
      clearInterval(recordingTimerRef.current);
    }
  };

  const sendRichMessage = (text, type = 'TEXT', mediaData = null, explicitRecipient = null, mediaFilename = null) => {
    const target = explicitRecipient || activeChatRef.current;
    const sender = currentUserRef.current?.email;
    if (!target || !sender || !stompClientRef.current?.connected) return false;

    const localId = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const chatMessage = {
      localId,
      senderEmail: sender,
      recipientEmail: target,
      content: text,
      timestamp: new Date().toISOString(),
      messageType: type,
      mediaData,
      mediaFilename
    };

    stompClientRef.current.publish({ destination: '/app/chat.send', body: JSON.stringify(chatMessage) });
    if (target === activeChatRef.current) setMessages((previous) => [...previous, chatMessage]);
    return true;
  };

  const handleSendMessage = async (event) => {
    event?.preventDefault();
    const text = newMessage.trim();
    if (isSending || (!text && !attachment)) return;
    if (activeContact?.canMessage === false) {
      showToast('This contact is not accepting messages.', 'info');
      return;
    }
    if (!isRealtimeConnected) {
      showToast('Realtime connection is unavailable. Message not sent.', 'error');
      return;
    }

    setIsSending(true);
    try {
      let mediaUrl = null;
      let mediaFilename = null;
      let messageType = 'TEXT';
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        formData.append('recipientEmail', activeChatRef.current);
        const uploadRes = await api.post('/api/chat/upload', formData);
        mediaUrl = uploadRes.data.url;
        mediaFilename = uploadRes.data.filename || attachment.name;
        if (attachment.type.startsWith('image/')) messageType = 'IMAGE';
        else if (attachment.type.startsWith('video/')) messageType = 'VIDEO';
        else if (attachment.type.startsWith('audio/')) messageType = 'AUDIO';
        else messageType = 'DOCUMENT';
      }

      if (!sendRichMessage(text, messageType, mediaUrl, null, mediaFilename)) {
        showToast('Realtime connection is unavailable. Message not sent.', 'error');
        return;
      }
      setNewMessage('');
      removeAttachment();
      setShowEmojiPicker(false);
      if (textareaRef.current) textareaRef.current.style.height = '48px';
      sendTypingStatus(false);
    } catch (error) {
      showToast(getApiErrorMessage(error, 'The attachment upload failed.'), 'error');
    } finally {
      setIsSending(false);
    }
  };

  const sendTypingStatus = (isTyping) => {
    if (currentUserRef.current?.typingIndicatorsEnabled === false) return;
    if (!stompClientRef.current?.connected || !activeChatRef.current || !currentUserRef.current?.email) return;
    stompClientRef.current.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        senderEmail: currentUserRef.current.email,
        recipientEmail: activeChatRef.current,
        isTyping: isTyping.toString()
      })
    });
  };

  const handleInputChange = (event) => {
    event.target.style.height = '48px';
    event.target.style.height = `${Math.min(event.target.scrollHeight, 128)}px`;
    setNewMessage(event.target.value);
    sendTypingStatus(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTypingStatus(false), 1500);
  };

  const activeContact = useMemo(
    () => friends.find((contact) => contact.email === activeChat) || null,
    [friends, activeChat]
  );

  const openSettings = (tab) => {
    setSettingsInitialTab(tab);
    setShowSettingsMenu(false);
    setShowSettingsModal(true);
  };

  const handleSaveProfile = async (payload) => {
    try {
      const response = await api.patch('/api/users/me', payload);
      setCurrentUser(response.data);
      setAuthUser(response.data);
      showToast('Profile updated.', 'success');
      return response.data;
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to update the profile.'));
    }
  };

  const handleSettingsUpdated = (nextSettings) => {
    const updatedUser = {
      ...currentUserRef.current,
      settings: nextSettings,
      notificationSoundsEnabled: nextSettings?.notifications?.sound !== 'NONE',
      typingIndicatorsEnabled: nextSettings?.privacy?.typingIndicators !== false
    };
    setCurrentUser(updatedUser);
    setAuthUser(updatedUser);
    if (nextSettings?.appearance?.theme) setThemePreference(nextSettings.appearance.theme);
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete('/api/users/me', { data: { confirmation: 'DELETE' } });
      clearSession();
      window.location.replace('/login');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to delete the account.'));
    }
  };

  const updateConversationPreference = async (field, value) => {
    if (!activeChat) return;
    try {
      const response = await api.patch(`/api/conversations/${encodeURIComponent(activeChat)}`, { [field]: value });
      setFriends((previous) => sortContacts(previous.map((contact) => (
        contact.email === activeChat ? { ...contact, ...response.data } : contact
      ))));
      setShowMoreMenu(false);
      if (field === 'pinned') showToast(value ? 'Chat pinned.' : 'Chat unpinned.', 'success');
      else if (field === 'muteDuration') showToast(value === 'OFF' ? 'Notifications unmuted.' : 'Mute schedule updated.', 'success');
      else if (field === 'disappearingMessagesSeconds') showToast(value ? 'Disappearing messages enabled.' : 'Disappearing messages disabled.', 'success');
      else showToast('Conversation settings updated.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to update conversation settings.'), 'error');
    }
  };

  const exportActiveChat = async () => {
    if (!activeChat) return;
    try {
      const response = await api.get(`/api/messages/export/${encodeURIComponent(activeChat)}`, { responseType: 'blob', timeout: 60_000 });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `neosis-chat-${activeChat.replace(/[^a-z0-9]+/gi, '-')}.txt`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('Chat export created.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Failed to export this chat.'), 'error');
    }
  };

  const confirmBlockContact = () => {
    if (!activeChat) return;
    const contactEmail = activeChat;
    setShowContactInfo(false);
    setConfirmDialog({
      title: 'Block this user?',
      description: 'Messages, files, requests, typing indicators, and calls will be blocked in both directions until you unblock them from Settings.',
      confirmLabel: 'Block user',
      danger: true,
      action: async () => {
        await api.post(`/api/safety/blocked/${encodeURIComponent(contactEmail)}`, {});
        setFriends((previous) => previous.filter((contact) => contact.email !== contactEmail));
        setActiveChat(null);
        setMessages([]);
        showToast('User blocked.', 'success');
      }
    });
  };

  const reportActiveContact = async ({ category, details }) => {
    if (!activeChat) return;
    try {
      await api.post('/api/safety/reports', { reportedEmail: activeChat, category, details });
      showToast('Report submitted for review.', 'success');
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'Failed to submit the report.'));
    }
  };

  const runConfirmation = async () => {
    if (!confirmDialog?.action) return;
    setIsConfirming(true);
    try {
      await confirmDialog.action();
      setConfirmDialog(null);
    } catch (error) {
      showToast(error?.message || 'The operation failed.', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  const confirmClearConversation = () => {
    if (!activeChat) return;
    setShowMoreMenu(false);
    setConfirmDialog({
      title: 'Clear this chat?',
      description: 'Messages will be hidden from your account on every device. This does not delete the other participant’s copy.',
      confirmLabel: 'Clear chat',
      danger: true,
      action: async () => {
        await api.delete(`/api/conversations/${encodeURIComponent(activeChat)}/messages`);
        setMessages([]);
        setUnreadCounts((previous) => ({ ...previous, [activeChat]: 0 }));
        setFriends((previous) => previous.map((contact) => contact.email === activeChat ? { ...contact, unreadCount: 0 } : contact));
        showToast('Chat cleared for your account.', 'success');
      }
    });
  };

  const confirmRemoveContact = () => {
    if (!activeChat) return;
    const contactEmail = activeChat;
    setShowMoreMenu(false);
    setConfirmDialog({
      title: 'Remove contact?',
      description: 'The accepted contact relationship will be removed. Existing stored messages are retained unless you clear them separately.',
      confirmLabel: 'Remove contact',
      danger: true,
      action: async () => {
        await api.delete(`/api/conversations/${encodeURIComponent(contactEmail)}`);
        setFriends((previous) => previous.filter((contact) => contact.email !== contactEmail));
        setActiveChat(null);
        setMessages([]);
        showToast('Contact removed.', 'success');
      }
    });
  };

  const displayedMessages = useMemo(() => { 
    const now = Date.now();
    const visibleMessages = messages.filter((message) => !message.expiresAt || new Date(message.expiresAt).getTime() > now);
    if (!isSearching || !searchQuery.trim()) return visibleMessages;
    const lowerQuery = searchQuery.toLowerCase();
    return visibleMessages.filter(m => m.content && m.content.toLowerCase().includes(lowerQuery));
  }, [messages, isSearching, searchQuery, expiryTick]);

  if (!currentUser) {
    return (
      <div className="flex h-screen bg-white dark:bg-[#111313] transition-colors duration-300 font-sans relative overflow-hidden p-2 md:p-4">
        <div className="w-full max-w-7xl mx-auto rounded-3xl shadow-2xl overflow-hidden flex h-full border border-gray-200 dark:border-[#323d38] relative z-10 bg-white dark:bg-[#111313]">
          <div className="hidden md:flex w-[350px] bg-slate-50 dark:bg-[#1a1f1d] flex-col flex-shrink-0 z-20 border-r border-gray-200 dark:border-[#232a28]">
            <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-[#232a28]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-200 dark:bg-[#232a28] rounded-lg animate-pulse"></div>
                <div className="w-20 h-5 bg-gray-200 dark:bg-[#232a28] rounded animate-pulse"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#232a28] rounded-lg animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#232a28] rounded-lg animate-pulse"></div>
              </div>
            </div>
            <div className="p-4 border-b border-gray-200 dark:border-[#232a28]">
              <div className="w-full h-10 bg-gray-200 dark:bg-[#232a28] rounded-lg animate-pulse"></div>
            </div>
            <div className="flex-1 p-2 space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-3.5 p-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-[#232a28] rounded-full animate-pulse shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="w-24 h-4 bg-gray-200 dark:bg-[#232a28] rounded animate-pulse"></div>
                    <div className="w-32 h-3 bg-gray-200 dark:bg-[#232a28] rounded animate-pulse"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-white dark:bg-[#111313]">
            <div className="px-6 py-4 bg-white dark:bg-[#1a1f1d] border-b border-gray-200 dark:border-[#232a28] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-gray-200 dark:bg-[#232a28] rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="w-28 h-4 bg-gray-200 dark:bg-[#232a28] rounded animate-pulse"></div>
                  <div className="w-16 h-3 bg-gray-200 dark:bg-[#232a28] rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#232a28] rounded-lg animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 dark:bg-[#232a28] rounded-lg animate-pulse"></div>
              </div>
            </div>
            <div className="flex-1 p-6 space-y-6">
              <div className="flex justify-start"><div className="w-64 h-16 bg-gray-100 dark:bg-[#232a28] rounded-2xl rounded-tl-sm animate-pulse"></div></div>
              <div className="flex justify-end"><div className="w-48 h-12 bg-gray-200 dark:bg-[#0fa384]/20 rounded-2xl rounded-br-sm animate-pulse"></div></div>
              <div className="flex justify-start"><div className="w-56 h-12 bg-gray-100 dark:bg-[#232a28] rounded-2xl rounded-tl-sm animate-pulse"></div></div>
              <div className="flex justify-start"><div className="w-40 h-10 bg-gray-100 dark:bg-[#232a28] rounded-2xl rounded-tl-sm animate-pulse"></div></div>
              <div className="flex justify-end"><div className="w-72 h-16 bg-gray-200 dark:bg-[#0fa384]/20 rounded-2xl rounded-br-sm animate-pulse"></div></div>
            </div>
            <div className="p-4 bg-white dark:bg-[#1a1f1d] border-t border-gray-200 dark:border-[#232a28]">
              <div className="w-full max-w-5xl mx-auto h-12 bg-gray-100 dark:bg-[#151817] rounded-xl animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getToastBg = (type) => {
    if (type === 'error') return 'bg-rose-500 text-white';
    if (type === 'info') return 'bg-[#151817] border border-[#323d38] text-white';
    return 'neosis-accent-bg text-white';
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#111313] transition-colors duration-300 font-sans relative overflow-hidden p-2 md:p-4">
      <SettingsModal
        open={showSettingsModal}
        initialTab={settingsInitialTab}
        user={currentUser}
        onClose={() => setShowSettingsModal(false)}
        onSaveProfile={handleSaveProfile}
        onSettingsUpdated={handleSettingsUpdated}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onChatsCleared={() => { setMessages([]); setUnreadCounts({}); fetchSidebarData(); }}
      />
      <ContactInfoModal
        open={showContactInfo}
        contact={activeContact}
        messageCount={messages.length}
        mediaCount={messages.filter((message) => message.messageType !== 'TEXT').length}
        onClose={() => setShowContactInfo(false)}
        onMute={(duration) => updateConversationPreference('muteDuration', duration)}
        onDisappearing={(seconds) => updateConversationPreference('disappearingMessagesSeconds', seconds)}
        onSearch={() => { setShowContactInfo(false); setIsSearching(true); setSearchQuery(''); }}
        onExport={exportActiveChat}
        onClear={() => { setShowContactInfo(false); confirmClearConversation(); }}
        onBlock={confirmBlockContact}
        onReport={reportActiveContact}
      />
      <ConfirmDialog
        open={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        description={confirmDialog?.description}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger}
        busy={isConfirming}
        onConfirm={runConfirmation}
        onClose={() => !isConfirming && setConfirmDialog(null)}
      />
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
                    <h3 className="font-bold text-gray-900 dark:text-white">Encrypted WebRTC calls</h3>
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
                  className="neosis-accent-bg w-full py-3.5 text-white font-bold rounded-xl transition-all shadow-lg shadow-[#0fa384]/20"
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
                  <motion.button aria-label="Accept Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={handleAcceptCall} className="neosis-accent-bg w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-[#0fa384]/30 text-white"><PhoneCall size={28} /></motion.button>
                </div>
              </div>
            ) : (
              <div className="w-full h-full p-4 flex flex-col relative max-w-6xl mx-auto">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="flex-1 relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-[#323d38] flex items-center justify-center">
                  {isVideoCall ? (
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <audio ref={remoteAudioRef} autoPlay />
                      <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2 }} className={`w-48 h-48 rounded-full flex items-center justify-center text-6xl font-bold bg-gradient-to-br ${getAvatarGradient(formatName(callPeerEmailRef.current))} shadow-2xl`}>{formatName(callPeerEmailRef.current).charAt(0)}</motion.div>
                    </>
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

      <motion.div variants={pageTransition} initial="hidden" animate="show" className={`w-full max-w-7xl mx-auto rounded-3xl shadow-2xl overflow-hidden flex h-full border border-gray-200 dark:border-[#323d38] relative z-10 bg-white dark:bg-[#111313] ${!hasAcceptedTC ? 'pointer-events-none blur-sm' : ''}`}>
        
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
                            <div key={req.id} className="p-4 border-b border-gray-100 dark:border-[#232a28]/50 flex justify-between items-center gap-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition">
                              <div className="min-w-0 flex-1"><div className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{formatName(req.senderEmail)}</div><div className="text-[11px] text-gray-400 truncate">{req.senderEmail}</div></div>
                              <div className="flex gap-2">
                                <motion.button aria-label="Reject Request" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleRejectRequest(req.id)} className="bg-gray-100 dark:bg-[#232a28] text-gray-500 dark:text-gray-300 p-2 rounded-lg hover:text-rose-500 transition-colors"><X size={16}/></motion.button>
                                <motion.button aria-label="Accept Request" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleAcceptRequest(req.id)} className="neosis-accent-bg text-white p-2 rounded-lg transition-all"><Check size={16}/></motion.button>
                              </div>
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
                        <button onClick={() => openSettings('account')} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><UserCog size={16} /> Account</button>
                        <button onClick={() => openSettings('privacy')} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><Shield size={16} /> Preferences</button>
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
              <input type="email" value={addEmailInput} onChange={(e) => setAddEmailInput(e.target.value)} placeholder="Add contact by email..." className="neosis-accent-focus w-full bg-white dark:bg-[#111313] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg pl-10 pr-10 py-2.5 text-sm outline-none transition-colors border border-gray-300 dark:border-[#323d38] shadow-sm dark:shadow-none" required />
              <button aria-label="Add Contact" type="submit" className="absolute right-2 text-gray-400 dark:text-[#0fa384] p-1 hover:bg-gray-100 dark:hover:bg-[#232a28] rounded-md transition-colors"><UserPlus size={18}/></button>
            </form>
          </div>

          <motion.div variants={listVariants} initial="hidden" animate="show" className="flex-1 overflow-y-auto custom-scrollbar contain-content">
            {friends.map((friend) => {
              const email = getContactEmail(friend);
              const fName = getContactName(friend);
              const isActive = activeChat === email;
              const unread = Number(unreadCounts[email] || friend.unreadCount || 0);
              return (
                <motion.div variants={itemVariants} key={email} onClick={() => handleOpenChat(email)} className={`neosis-contact-row relative flex items-center gap-3.5 p-4 cursor-pointer transition-all duration-150 ${isActive ? 'bg-gray-100 dark:bg-[#1f2422]' : 'hover:bg-gray-50 dark:hover:bg-[#151817]'}`}>
                  {isActive && <motion.div layoutId="activeIndicator" className="neosis-accent-bg absolute left-0 top-0 bottom-0 w-1" transition={{ type: "spring", stiffness: 300, damping: 30 }} />}
                  <div className="relative">
                    <div className={`w-12 h-12 bg-gradient-to-br ${getAvatarGradient(fName)} rounded-full flex items-center justify-center text-white font-bold text-lg`}>{fName.charAt(0).toUpperCase()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-[15px]">{fName}</div>
                      <div className="flex items-center gap-1.5 text-gray-400">
                        {friend.pinned && <Pin size={13} className="text-[#0fa384]" aria-label="Pinned" />}
                        {friend.muted && <BellOff size={13} aria-label="Muted" />}
                      </div>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{friend.statusMessage || 'Available on Neosis'}</div>
                      {unread > 0 && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="bg-[#ff8f24] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{unread > 99 ? '99+' : unread}</motion.div>}
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {friends.length === 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-10 flex flex-col items-center justify-center text-gray-500 text-center px-6">
                <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }} className="w-16 h-16 bg-white dark:bg-[#151817] shadow-sm dark:shadow-none rounded-2xl flex items-center justify-center mb-4 transition-colors"><UserPlus size={24} className="text-gray-400 dark:text-[#0fa384]" /></motion.div>
                <h3 className="text-gray-900 dark:text-gray-200 font-medium mb-1 font-display">No chats yet</h3>
                <p className="text-xs leading-relaxed dark:text-gray-500">Add a contact by email to start a conversation.</p>
              </motion.div>
            )}
          </motion.div>
          <button type="button" onClick={() => openSettings('account')} className="p-4 border-t border-gray-200 dark:border-[#232a28] flex items-center gap-3 text-left hover:bg-gray-100 dark:hover:bg-[#151817] transition-colors">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarGradient(currentUser.name || currentUser.email)} flex items-center justify-center text-white font-bold`}>{(currentUser.name || currentUser.email || '?').charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{currentUser.name || formatName(currentUser.email)}</div><div className="text-xs text-gray-500 dark:text-gray-400 truncate">{currentUser.statusMessage || 'Available on Neosis'}</div></div>
            <span className={`w-2.5 h-2.5 rounded-full ${isRealtimeConnected ? 'neosis-accent-bg' : 'bg-amber-500'}`} title={isRealtimeConnected ? 'Realtime connected' : 'Reconnecting'} />
          </button>
        </div>

        <div className={`${!activeChat ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white dark:bg-[#111313] relative transition-colors duration-300`}>
          {!activeChat ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center relative z-10 text-gray-500 dark:text-gray-400">
              <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="w-24 h-24 bg-gray-50 dark:bg-[#1a1f1d] rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-100 dark:border-[#232a28]"><MessageSquare size={40} className="text-gray-400 dark:text-[#0fa384]" /></motion.div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 font-display">Neosis Web</h2>
              <p className="text-sm max-w-sm text-center leading-relaxed">Select a contact from the sidebar to open a private, authenticated conversation.</p>
            </motion.div>
          ) : (
            <div className="flex flex-col h-full relative z-10">
              <div className="px-6 py-4 bg-white dark:bg-[#1a1f1d] border-b border-gray-200 dark:border-[#232a28] flex items-center justify-between z-20 transition-colors">
                <div className="flex items-center gap-4">
                  <motion.button aria-label="Go Back" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setActiveChat(null)} className="md:hidden text-gray-400 dark:hover:text-white transition"><ArrowLeft size={24} /></motion.button>
                  <button type="button" onClick={() => setShowContactInfo(true)} className="relative" aria-label="Open contact information">
                    <div className={`w-11 h-11 bg-gradient-to-br ${getAvatarGradient(getContactName(activeContact || activeChat))} rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm`}>{getContactName(activeContact || activeChat).charAt(0).toUpperCase()}</div>
                  </button>
                  <button type="button" onClick={() => setShowContactInfo(true)} className="text-left min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white text-[16px] truncate">{getContactName(activeContact || activeChat)}</div>
                    <div className={`text-[12px] font-medium flex items-center gap-1.5 mt-0.5 ${isRealtimeConnected ? 'neosis-accent-text' : 'text-amber-500'}`}>{isRemoteTyping ? <span className="italic animate-pulse">typing...</span> : (!isRealtimeConnected ? 'Reconnecting…' : (activeContact?.online ? 'Online now' : (activeContact?.lastSeenAt ? `Last seen ${new Date(activeContact.lastSeenAt).toLocaleString()}` : (activeContact?.statusMessage || 'Presence hidden'))))}</div>
                  </button>
                </div>

                <div className="flex items-center gap-2 text-gray-400 dark:text-gray-400">
                  <motion.button aria-label="Audio Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStartCall(false)} className="p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors"><Phone size={20}/></motion.button>
                  <motion.button aria-label="Video Call" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleStartCall(true)} className="p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors"><Video size={22}/></motion.button>
                  <div className="w-px h-6 bg-gray-200 dark:bg-[#323d38] mx-2 transition-colors"></div>
                  <motion.button aria-label="Search Chat" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => { setIsSearching(!isSearching); setSearchQuery(''); }} className={`p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors ${isSearching ? 'text-[#0fa384] bg-[#0fa384]/10' : ''}`}><Search size={20}/></motion.button>
                  <div className="relative">
                    <motion.button aria-label="Menu" whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setShowMoreMenu(!showMoreMenu)} className="p-2 rounded-lg hover:text-gray-900 hover:bg-gray-100 dark:hover:text-white dark:hover:bg-[#202523] transition-colors"><MoreVertical size={20}/></motion.button>
                    <AnimatePresence>
                      {showMoreMenu && (
                        <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="absolute right-0 top-10 w-48 bg-white dark:bg-[#151817] rounded-xl shadow-xl border border-gray-200 dark:border-[#323d38] overflow-hidden z-50">
                          <div className="flex flex-col text-sm text-gray-700 dark:text-gray-200">
                            <button onClick={() => { setShowMoreMenu(false); setShowContactInfo(true); }} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><User size={16} /> Contact info</button>
                            <button onClick={() => updateConversationPreference('pinned', !activeContact?.pinned)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><Pin size={16} /> {activeContact?.pinned ? 'Unpin chat' : 'Pin chat'}</button>
                            <button onClick={() => updateConversationPreference('muted', !activeContact?.muted)} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left">{activeContact?.muted ? <BellRing size={16} /> : <BellOff size={16} />} {activeContact?.muted ? 'Unmute notifications' : 'Mute notifications'}</button>
                            <button onClick={confirmClearConversation} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-[#1a1f1d] transition w-full text-left"><Trash2 size={16} /> Clear chat</button>
                            <div className="h-px bg-gray-200 dark:bg-[#232a28]" />
                            <button onClick={confirmRemoveContact} className="flex items-center gap-3 px-4 py-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-500 transition w-full text-left"><UserMinus size={16} /> Remove contact</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
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
              
              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-5 bg-white dark:bg-[#111313] transition-colors relative">
                {isChatLoading ? (
                  <div className="w-full h-full space-y-6">
                    <div className="flex justify-start"><div className="w-64 h-16 bg-gray-100 dark:bg-[#232a28] rounded-2xl rounded-tl-sm animate-pulse"></div></div>
                    <div className="flex justify-end"><div className="w-48 h-12 bg-gray-200 dark:bg-[#0fa384]/20 rounded-2xl rounded-br-sm animate-pulse"></div></div>
                    <div className="flex justify-start"><div className="w-56 h-12 bg-gray-100 dark:bg-[#232a28] rounded-2xl rounded-tl-sm animate-pulse"></div></div>
                    <div className="flex justify-start"><div className="w-40 h-10 bg-gray-100 dark:bg-[#232a28] rounded-2xl rounded-tl-sm animate-pulse"></div></div>
                    <div className="flex justify-end"><div className="w-72 h-16 bg-gray-200 dark:bg-[#0fa384]/20 rounded-2xl rounded-br-sm animate-pulse"></div></div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {displayedMessages.map((msg, index) => {
                      const isMe = msg.senderEmail === currentUser.email;
                      const rawContent = msg.content;
                      const messageKey = msg.id || msg.localId || `${index}-${msg.timestamp}`;
                      const isPending = isMe && !msg.id; 
                      const imageAllowed = isMe || currentUser?.settings?.media?.autoDownloadImages !== false || revealedMedia.has(messageKey);
                      const videoAllowed = isMe || currentUser?.settings?.media?.autoDownloadVideos === true || revealedMedia.has(messageKey);
                      const safeLink = currentUser?.settings?.media?.linkPreviews === false ? null : firstSafeLink(rawContent);
                      
                      return (
                        <motion.div layout variants={messageVariants} initial="hidden" animate="show" key={messageKey} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            <div className={`${currentUser?.settings?.appearance?.bubbleDensity === 'COMPACT' ? 'px-3 py-1.5' : 'px-4 py-2.5'} text-[15px] leading-relaxed shadow-sm break-words ${isMe ? 'neosis-accent-bg text-white rounded-2xl rounded-br-sm' : 'bg-gray-100 dark:bg-[#232a28] text-gray-900 dark:text-gray-200 rounded-2xl rounded-tl-sm transition-colors'}`}>
                              
                              {msg.messageType === 'IMAGE' && (imageAllowed ? <img src={resolveMediaUrl(msg.mediaData)} crossOrigin="use-credentials" loading="lazy" alt="attachment" className="rounded-lg max-w-full h-auto mb-2 object-cover" /> : <button type="button" onClick={() => setRevealedMedia((items) => new Set(items).add(messageKey))} className="mb-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold">Load image</button>)}
                              {msg.messageType === 'VIDEO' && (videoAllowed ? <video src={resolveMediaUrl(msg.mediaData)} crossOrigin="use-credentials" preload="metadata" controls className="rounded-lg max-w-full h-auto mb-2" /> : <button type="button" onClick={() => setRevealedMedia((items) => new Set(items).add(messageKey))} className="mb-2 rounded-lg border border-white/20 px-4 py-3 text-sm font-semibold">Load video</button>)}
                              {msg.messageType === 'AUDIO' && <audio src={resolveMediaUrl(msg.mediaData)} crossOrigin="use-credentials" preload="none" controls className="mb-2 max-w-[240px] h-10 rounded-full" />}
                              
                              {msg.messageType === 'DOCUMENT' && (
                                <a href={resolveMediaUrl(msg.mediaData)} download={msg.mediaFilename || "Neosis_Document"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2 p-3 bg-black/20 rounded-xl hover:bg-black/30 transition-colors text-white border border-[#323d38] cursor-pointer no-underline">
                                  <FileText size={20} className="text-[#0fa384]"/>
                                  <span className="font-medium text-sm truncate">{msg.mediaFilename || 'Download Document'}</span>
                                </a>
                              )}

                              {isSearching && searchQuery && rawContent ? highlightText(rawContent, searchQuery) : rawContent}
                              {safeLink && <a href={safeLink.href} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-full rounded-lg border border-black/10 bg-black/10 px-3 py-2 text-xs no-underline hover:bg-black/20"><span className="block truncate font-bold">{safeLink.hostname}</span><span className="block truncate opacity-75">{safeLink.href}</span></a>}
                            </div>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 font-medium px-1 flex items-center gap-1 font-mono">
                              {formatMessageTime(msg)} 
                              {msg.expiresAt && <span title={`Disappears ${new Date(msg.expiresAt).toLocaleString()}`}>· <Clock3 size={11} className="inline" /></span>}
                              {isMe && (isPending ? <Loader2 size={12} className="text-gray-300 dark:text-gray-600 animate-spin" /> : (msg.readAt ? <CheckCheck size={14} className="text-[#0fa384]" aria-label="Read" /> : <Check size={13} className="text-gray-400" aria-label="Delivered" />))}
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

              <AnimatePresence>
                {attachmentPreview && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-24 left-4 right-4 bg-white dark:bg-[#1a1f1d] border border-gray-200 dark:border-[#323d38] p-3 rounded-xl shadow-2xl z-30 flex items-center gap-4">
                    {attachmentPreview === 'DOCUMENT' ? (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-[#232a28] rounded-lg flex items-center justify-center"><FileText className="text-gray-500" /></div>
                    ) : attachmentPreview === 'VIDEO' ? (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-[#232a28] rounded-lg flex items-center justify-center"><Video className="text-gray-500" /></div>
                    ) : (
                      <img src={attachmentPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-[#323d38]" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{attachment.name}</p>
                      <p className="text-xs text-gray-500">{(attachment.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={removeAttachment} className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white transition-colors"><X size={18}/></button>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div ref={emojiPickerRef} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`absolute left-4 w-72 bg-white dark:bg-[#1a1f1d] border border-gray-200 dark:border-[#323d38] rounded-xl shadow-2xl z-30 p-2 h-64 overflow-y-auto custom-scrollbar flex flex-wrap gap-1 content-start ${attachmentPreview ? 'bottom-40' : 'bottom-24'}`}>
                    {EMOJI_LIST.map((emoji, idx) => (
                      <button key={`${idx}-${emoji}`} type="button" onClick={() => onEmojiClick(emoji)} className="w-8 h-8 text-xl hover:bg-gray-100 dark:hover:bg-[#232a28] rounded flex items-center justify-center transition-colors">
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 bg-white dark:bg-[#1a1f1d] border-t border-gray-200 dark:border-[#232a28] z-20 transition-colors">
                {isRecording ? (
                  <div className="flex items-center gap-4 max-w-5xl mx-auto w-full bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">
                    <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>
                    <span className="text-rose-500 font-mono font-bold flex-1">Recording... {recordingTime}s</span>
                    <button onClick={stopRecording} className="bg-rose-500 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-rose-600 transition-colors">Stop & Send</button>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-5xl mx-auto w-full">
                    <div className="flex items-center gap-1 pb-1.5">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx" />
                      <button type="button" disabled={activeContact?.canMessage === false} onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:bg-[#232a28] rounded-lg transition-colors disabled:opacity-40"><Paperclip size={20}/></button>
                      <button type="button" onClick={() => {
                        if (!showEmojiPicker && attachmentPreview) {}
                        setShowEmojiPicker(!showEmojiPicker);
                      }} className={`p-2 rounded-lg transition-colors ${showEmojiPicker ? 'text-[#0fa384] bg-[#0fa384]/10' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white dark:hover:bg-[#232a28]'}`}><Smile size={20}/></button>
                      <button type="button" disabled={activeContact?.canMessage === false} onClick={startRecording} className="p-2 text-gray-400 hover:text-rose-500 dark:hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-40"><Mic size={20}/></button>
                    </div>
                    <textarea ref={textareaRef} value={newMessage} disabled={activeContact?.canMessage === false} onChange={handleInputChange} maxLength={5000} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }} placeholder={activeContact?.canMessage === false ? "This contact is not accepting messages" : (attachment ? "Add a caption..." : "Type a message...")} className="neosis-accent-focus flex-1 bg-gray-50 dark:bg-[#151817] text-gray-900 dark:text-white border border-gray-300 dark:border-[#323d38] rounded-xl px-4 py-3 placeholder-gray-400 dark:placeholder-gray-500 text-[15px] resize-none custom-scrollbar outline-none transition-all focus:shadow-[0_0_10px_rgba(15,163,132,0.15)] disabled:opacity-60" rows="1" />
                    <button type="submit" disabled={isSending || activeContact?.canMessage === false} className={`p-3 rounded-xl shadow-lg transition-all flex-shrink-0 mb-0.5 ${isSending || activeContact?.canMessage === false ? 'bg-gray-400 cursor-not-allowed' : 'neosis-accent-bg text-white'}`}>
                      {isSending ? <Loader2 size={20} className="animate-spin text-white" /> : <Send size={20}/>}
                    </button>
                  </form>
                )}
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
  );
}
