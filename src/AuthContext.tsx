import React, { createContext, useContext, useState } from 'react';

type Role = 'admin_finance' | 'admin_director' | 'staff' | 'admin' | 'admin_hr' | 'admin_dept_head';

interface User {
  id: string;
  name: string;
  role: Role;
  department: string;
}

interface AuthContextType {
  currentUser: User;
  toggleRole: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>({
    id: 'staff_123',
    name: 'Brother Ali',
    role: 'admin_finance',
    department: 'Admin'
  });

  const toggleRole = () => {
    setCurrentUser(prev => {
      let nextRole: Role = 'staff';
      if (prev.role === 'staff') nextRole = 'admin_finance';
      else if (prev.role === 'admin_finance') nextRole = 'admin_director';
      return { ...prev, role: nextRole };
    });
  };

  return (
    <AuthContext.Provider value={{ currentUser, toggleRole }}>
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
