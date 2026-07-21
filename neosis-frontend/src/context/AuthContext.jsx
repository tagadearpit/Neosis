import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api, { resetCsrfToken } from '../api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);

  const refreshSession = useCallback(async () => {
    setIsLoading(true);
    setSessionError(null);
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await api.get('/api/users/me', {
            __suppressUnauthorizedEvent: true,
            timeout: 45_000
          });
          setUser(response.data);
          return response.data;
        } catch (error) {
          const status = error?.response?.status;
          if (status === 401) {
            setUser(null);
            return null;
          }

          const canRetry = attempt === 0 && (!error?.response || status >= 500);
          if (canRetry) {
            await new Promise((resolve) => window.setTimeout(resolve, 1_200));
            continue;
          }

          setSessionError('The backend may be waking up or temporarily unavailable. Your login state has not been changed.');
          return null;
        }
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearSession = useCallback(() => {
    resetCsrfToken();
    setUser(null);
    setSessionError(null);
    setIsLoading(false);
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
    sessionError,
    refreshSession,
    clearSession
  }), [user, isLoading, sessionError, refreshSession, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
