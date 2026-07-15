import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { resetCsrfToken } from '../api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const response = await api.get('/api/users/me', { __suppressUnauthorizedEvent: true });
      setUser(response.data);
      return response.data;
    } catch (error) {
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    resetCsrfToken();
    setUser(null);
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const handleUnauthorized = () => clearSession();
    window.addEventListener('neosis:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('neosis:unauthorized', handleUnauthorized);
  }, [clearSession]);

  const value = useMemo(() => ({
    user,
    setUser,
    isAuthenticated: Boolean(user),
    isLoading,
    refreshSession,
    clearSession
  }), [user, isLoading, refreshSession, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
