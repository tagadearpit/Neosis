import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import NeosisChatWrapped from './components/NeosisChat';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Render the stunning new animated login page at /login */}
        <Route path="/login" element={<Login />} />
        
        {/* Render your WebRTC Chat application at the root / */}
        <Route path="/" element={<NeosisChatWrapped />} />
        <Route path="/chat" element={<NeosisChatWrapped />} />
        
        {/* Catch-all redirects back to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}