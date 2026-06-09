import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import Login from './components/Login';
import NeosisChatWrapped from './components/NeosisChat';

// Import the new Auth Context
import { AuthProvider, AuthContext } from './context/AuthContext';

// Real Route Protection Wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useContext(AuthContext);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060e20] flex items-center justify-center text-[#4edea3] font-mono text-xs animate-pulse">
        Verifying Secure Session...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [securityAlerts, setSecurityAlerts] = useState([]);
  
  const timeoutsRef = useRef(new Set());
  const alertCooldowns = useRef(new Map());

  const triggerSecurityAlert = useCallback((message) => {
    const now = Date.now();
    const lastTime = alertCooldowns.current.get(message) || 0;
    
    if (now - lastTime < 2000) return;
    alertCooldowns.current.set(message, now);

    const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2, 9);
    
    setSecurityAlerts((prev) => [...prev, { id, message }]);
    
    const timeoutId = setTimeout(() => {
      setSecurityAlerts((prev) => prev.filter((alert) => alert.id !== id));
      timeoutsRef.current.delete(timeoutId);
    }, 4000);
    
    timeoutsRef.current.add(timeoutId);
  }, []);

  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
      timeoutsRef.current.clear();
      alertCooldowns.current.clear();
    };
  }, []);

  useEffect(() => {
    const handleContextMenu = (e) => {
      e.preventDefault();
      triggerSecurityAlert("Context menu disabled.");
    };

    const handleKeyDown = (e) => {
      const isMac = navigator.userAgentData?.platform === 'macOS' || navigator.userAgent?.includes('Mac');

      if (e.key === 'F12') {
        e.preventDefault();
        triggerSecurityAlert("Developer tools disabled.");
      }

      if (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        triggerSecurityAlert("Inspection tools disabled.");
      }

      if (isMac && e.metaKey && e.altKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) {
        e.preventDefault();
        triggerSecurityAlert("Inspection tools disabled.");
      }

      if ((e.ctrlKey && ['U', 'u'].includes(e.key)) || (isMac && e.metaKey && e.altKey && ['U', 'u'].includes(e.key))) {
        e.preventDefault();
        triggerSecurityAlert("Source view disabled.");
      }

      if ((e.ctrlKey || e.metaKey) && ['S', 's'].includes(e.key)) {
        e.preventDefault();
        triggerSecurityAlert("Page saving disabled.");
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerSecurityAlert]);

  return (
    <AuthProvider>
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence>
          {securityAlerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="bg-[#131b2e]/95 backdrop-blur-md border border-[#ffb4ab]/40 rounded-xl p-4 shadow-[0_0_25px_rgba(255,180,171,0.15)] flex items-start gap-3 pointer-events-auto"
            >
              <div className="bg-[#ffb4ab]/10 p-2 rounded-lg shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-[#ffb4ab]" />
              </div>
              <div className="flex flex-col">
                <h4 className="text-[#ffb4ab] text-[10px] font-mono font-bold uppercase tracking-widest mb-0.5">
                  Action Blocked
                </h4>
                <p className="text-[#dae2fd] text-sm font-sans leading-tight">
                  {alert.message}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <NeosisChatWrapped />
            </ProtectedRoute>
          } />
          <Route path="/chat" element={
            <ProtectedRoute>
              <NeosisChatWrapped />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}