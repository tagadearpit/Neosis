import React, { useContext } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import NeosisChatWrapped from './components/NeosisChat';
import { AuthContext, AuthProvider } from './context/AuthContext';

function SessionLoader() {
  return (
    <div className="min-h-screen bg-[#060e20] flex items-center justify-center text-[#4edea3] font-mono text-xs animate-pulse">
      Verifying secure session...
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return <SessionLoader />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated, isLoading } = useContext(AuthContext);
  if (isLoading) return <SessionLoader />;
  return isAuthenticated ? <Navigate to="/chat" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/" element={<ProtectedRoute><NeosisChatWrapped /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><NeosisChatWrapped /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
