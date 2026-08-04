import React, { createContext, useContext, useState, useEffect } from 'react';
import client from '../api/client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await client.get('/auth/me');
      if (response.data.success) {
        setUser(response.data.data);
      } else {
        logout();
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setUser(null);
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    setIsLoading(true);
    try {
      const response = await client.post('/auth/login', { email, password });
      if (response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, error: 'Failed to authenticate user' };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Login error';
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const register = async (email, password, fullName, securityQuestion, securityAnswer) => {
    setIsLoading(true);
    try {
      const response = await client.post('/auth/register', { email, password, fullName, securityQuestion, securityAnswer });
      if (response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data.data;
        localStorage.setItem('token', receivedToken);
        setToken(receivedToken);
        setUser(receivedUser);
        return { success: true };
      }
      return { success: false, error: 'Registration error occurred' };
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Registration error';
      setIsLoading(false);
      return { success: false, error: errorMsg };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
