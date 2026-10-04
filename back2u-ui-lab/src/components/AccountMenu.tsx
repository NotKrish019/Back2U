"use client";
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Settings } from 'lucide-react';
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
      <Link 
        href="/login" 
        className="hidden sm:inline-flex px-4 py-2 bg-[#FF3E72] text-white font-mono text-[11px] font-bold tracking-[0.08em] uppercase border border-[#211C2B] shadow-[2px_2px_0px_#211C2B] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#211C2B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all items-center gap-1.5"
      >
        <span>LOGIN</span>
      </Link>
    );
  }

  return (
    <div ref={dropdownRef} className="relative flex items-center gap-4">
      <button 
        onClick={handleSignOut}
        className="hidden sm:inline-flex px-4 py-2 bg-[#FF3E72] text-white font-mono text-[11px] font-bold tracking-[0.08em] uppercase border border-[#211C2B] shadow-[2px_2px_0px_#211C2B] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#211C2B] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all items-center gap-1.5"
      >
        <span>SIGN OUT</span>
      </button>

      <button 
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center ml-1 focus:outline-none relative"
        aria-label="Profile menu"
      >
        <span 
          className="grid place-items-center w-8 h-8 rounded-full bg-[#2A2140] text-[#FFF9F4] border border-[#211C2B] text-[10px] hover:scale-105 active:scale-95 transition-transform"
          style={{ fontFamily: '"DM Mono", monospace' }}
        >
          ME
        </span>
      </button>

      <AnimatePresence>
        {dropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute top-[calc(100%+8px)] right-0 bg-[#FFF9F4] border-[2px] border-[#211C2B] shadow-[4px_4px_0px_#211C2B] min-w-[220px] rounded-sm overflow-hidden z-50 text-[#211C2B] font-sans"
          >
            <div className="p-4 border-b-[2px] border-[#211C2B] bg-[#FFF9F4]">
              <div className="font-bold text-[14px]">{user?.displayName || "User"}</div>
              <div className="text-[11px] text-[#5A5261] font-mono break-all mt-1">{user?.email || ""}</div>
            </div>
            
            {/* Links */}
            <div className="flex flex-col p-2 bg-[#FFF9F4]">
              <Link 
                href="/reports" 
                onClick={() => setDropdownOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold rounded-sm hover:bg-[#211C2B] hover:text-[#FFF9F4] transition-colors"
              >
                <FileText size={16} />
                My Reports
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setDropdownOpen(false)} 
                className="flex items-center gap-3 px-3 py-2.5 text-[13px] font-bold rounded-sm hover:bg-[#211C2B] hover:text-[#FFF9F4] transition-colors mt-1"
              >
                <Settings size={16} />
                Account Settings
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
