import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '@/services/auth.service';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageData = () => {
      const storedUser = authService.getUser();
      const token = authService.getToken();

      if (storedUser && token) {
        setUser(storedUser);
      }

      setLoading(false);
    };

    loadStorageData();
  }, []);

  const signIn = (token: string, user: User) => {
    authService.setToken(token);
    authService.setUser(user);
    setUser(user);
  };

  const signOut = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};