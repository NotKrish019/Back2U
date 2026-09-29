'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './config';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    console.log("AuthContext: useEffect running, initializing Firebase auth listener");
    try {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        console.log("AuthContext: onAuthStateChanged fired! User:", currentUser);
        setUser(currentUser);
        
        if (currentUser) {
          try {
            const token = await currentUser.getIdToken();
            const res = await fetch('http://127.0.0.1:8000/api/v1/users/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              setIsAdmin(data.is_admin === "true");
            } else {
              setIsAdmin(false);
            }
          } catch (e) {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
        
        setLoading(false);
      }, (error) => {
        console.error("AuthContext: onAuthStateChanged error:", error);
        setLoading(false);
        setIsAdmin(false);
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
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
