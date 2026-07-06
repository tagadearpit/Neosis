import React, { createContext, useState, useEffect } from 'react';
import api from '../api'; // CRITICAL FIX: Import your configured api instance

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // Ping the backend using the configured instance.
        // It automatically knows the BACKEND_URL and attaches credentials!
        await api.get('/api/users/me'); 
        setIsAuthenticated(true);
      } catch (error) {
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};