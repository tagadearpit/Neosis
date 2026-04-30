import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import NeosisChat from './components/NeosisChat';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Default route shows the Login page */}
        <Route path="/" element={<Login />} />
        
        {/* The route Google will redirect to after successful login */}
        <Route path="/chat" element={<NeosisChat />} />
        
        {/* Catch-all redirect back to login if they type a random URL */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
