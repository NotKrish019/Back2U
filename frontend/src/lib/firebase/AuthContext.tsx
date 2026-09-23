'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("AuthContext: useEffect running, initializing Firebase auth listener");
    try {
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("AuthContext: onAuthStateChanged fired! User:", currentUser);
        setUser(currentUser);
        setLoading(false);
      }, (error) => {
        console.error("AuthContext: onAuthStateChanged error:", error);
        setLoading(false);
      });

      return () => {
        console.log("AuthContext: Unsubscribing auth listener");
        unsubscribe();
      };
    } catch (e) {
      console.error("AuthContext: Error setting up auth listener:", e);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
