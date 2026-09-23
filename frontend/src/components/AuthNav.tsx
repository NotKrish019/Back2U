'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/firebase/AuthContext';
import { logOut } from '@/lib/firebase/authService';
import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await logOut();
    setDropdownOpen(false);
    router.refresh();
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <nav style={{ display: 'flex', gap: '2rem', opacity: 0.5 }}>Loading...</nav>;
  }

  return (
    <nav style={{ display: 'flex', gap: '2rem', opacity: 0.8, alignItems: 'center', position: 'relative' }}>
      {user ? (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ 
              background: 'rgba(255,255,255,0.1)', 
              border: '1px solid rgba(255,255,255,0.2)', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--white)',
              transition: 'all 0.2s',
              padding: 0,
              overflow: 'hidden'
            }}
            className="hover:bg-white/20"
          >
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <User size={20} />
            )}
          </button>

          <AnimatePresence>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  backgroundColor: 'var(--white)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  minWidth: '220px',
                  overflow: 'hidden',
                  zIndex: 100,
                  color: 'var(--text-purple)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-cream)' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-purple)' }}>{user.displayName || 'Campus User'}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, wordBreak: 'break-all' }}>{user.email}</div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                  <Link href="/my-reports" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 500, borderRadius: '6px', transition: 'background 0.2s', color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-cream)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <FileText size={16} />
                    My Reports
                  </Link>
                  <Link href="/settings" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 500, borderRadius: '6px', transition: 'background 0.2s', color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-cream)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Settings size={16} />
                    Account Settings
                  </Link>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '0.25rem 0' }} />
                  
                  <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', fontWeight: 500, borderRadius: '6px', transition: 'background 0.2s', color: 'var(--accent-red)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(240, 92, 85, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Link href="/login" style={{ transition: 'opacity 0.2s', fontWeight: 700, color: 'var(--accent-red)' }} className="hover:opacity-100">
          Sign In
        </Link>
      )}
    </nav>
  );
}
