import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './services/api';

export type Role = 'admin_finance' | 'admin_director' | 'staff' | 'admin' | 'admin_hr' | 'admin_dept_head';

export interface User {
  id: string;
  name: string;
  role: Role;
  department: string;
  email?: string;
  member_id?: number | null;
}

interface AuthContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isAuthLoading: boolean;
  logout: () => Promise<void>;
}

const EMPTY_USER: User = {
  id: '',
  name: '',
  role: 'staff',
  department: '',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : EMPTY_USER;
    } catch {
      return EMPTY_USER;
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Sync user state to localStorage for offline persistence
  const handleSetUser = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
    } catch (e) {
      console.warn('Failed to cache user in localStorage', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        try {
          const remoteUser = await api.auth.getUser();
          if (isMounted && remoteUser?.id) {
            handleSetUser(remoteUser);
          }
        } catch {
          // Token expired or invalid
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
          if (isMounted) {
            setCurrentUser(EMPTY_USER);
          }
        }
      }
      if (isMounted) {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleAuthExpired = () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      setCurrentUser(EMPTY_USER);
    };
    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(EMPTY_USER);
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, isAuthLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
