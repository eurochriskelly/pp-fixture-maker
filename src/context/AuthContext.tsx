import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loginOverrideEnabled = import.meta.env.VITE_LOGIN_OVERRIDE === '1';
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('tournament_maker_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('tournament_maker_user');
      }
    }
    setIsLoading(false);
  }, []);

  // Save user to local storage when it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('tournament_maker_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('tournament_maker_user');
    }
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    // Simulate API call - in a real app, this would call an auth API
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // For demo purposes, accept any valid-looking email/password
        if (!email.includes('@') || password.length < 4) {
          reject(new Error('Invalid credentials'));
          return;
        }
        
        const newUser: User = {
          id: 'user_' + Date.now(),
          email,
          name: email.split('@')[0]
        };
        
        setUser(newUser);
        resolve();
      }, 500);
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    // Simulate API call
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        if (!email.includes('@') || password.length < 4 || !name.trim()) {
          reject(new Error('Invalid registration data'));
          return;
        }
        
        const newUser: User = {
          id: 'user_' + Date.now(),
          email,
          name
        };
        
        setUser(newUser);
        resolve();
      }, 500);
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: loginOverrideEnabled || !!user,
      isLoading,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};
