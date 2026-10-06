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
  toggleRole: () => void;
  isAuthLoading: boolean;
  logout: () => Promise<void>;
}

const DEFAULT_USER: User = {
  id: '1',
  name: 'Brother Ali',
  role: 'admin_finance',
  department: 'Admin'
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const saved = localStorage.getItem('auth_user');
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
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
        }
      }
      if (isMounted) {
        setIsAuthLoading(false);
      }
    };

    checkAuth();
    return () => { isMounted = false; };
  }, []);

  const toggleRole = () => {
    setCurrentUser(prev => {
      let nextRole: Role = 'staff';
      if (prev.role === 'staff') nextRole = 'admin_finance';
      else if (prev.role === 'admin_finance') nextRole = 'admin_director';
      const updated = { ...prev, role: nextRole };
      try {
        localStorage.setItem('auth_user', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCurrentUser(DEFAULT_USER);
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, toggleRole, isAuthLoading, logout }}>
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
