"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, LogOut, Settings } from 'lucide-react';
import { auth } from '@/lib/firebase/config';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

export default function AccountMenu() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);

  // Read auth state on mount and subscribe to auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    setDropdownOpen(false);
    router.push('/');
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <Link href="/login" className="b2-btn b2-btn--sm b2-nav__desk-only">
        Log in
      </Link>
    );
  }

  const initials = (user?.displayName || user?.email || "Me")
    .split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "ME";

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="b2-avatar"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
      >
        {initials}
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: "top right" }}
            className="b2-menu"
          >
            <div className="b2-menu__head">
              <div className="font-medium text-[0.95rem]">{user?.displayName || "Signed in"}</div>
              <div className="b2-num text-[11.5px] text-[var(--b2-graphite)] break-all mt-1">{user?.email || ""}</div>
            </div>
            <div className="py-1.5">
              <Link role="menuitem" href="/reports" onClick={() => setDropdownOpen(false)} className="b2-menu__item">
                <FileText size={16} strokeWidth={1.6} /> My reports
              </Link>
              <Link role="menuitem" href="/settings" onClick={() => setDropdownOpen(false)} className="b2-menu__item">
                <Settings size={16} strokeWidth={1.6} /> Account settings
              </Link>
              <button role="menuitem" onClick={handleSignOut} className="b2-menu__item border-t border-[var(--b2-line)] mt-1.5">
                <LogOut size={16} strokeWidth={1.6} /> Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
