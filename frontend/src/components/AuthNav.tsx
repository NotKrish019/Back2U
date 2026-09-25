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
    return <div style={{ opacity: 0.5 }}>...</div>;
  }

  return (
    <>
      {user ? (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button 
            className="profile-button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-label="Profile"
          >
            <User size={18} />
            <span>
              {user.displayName ? user.displayName.substring(0, 2).toUpperCase() : 'ME'}
            </span>
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
                  backgroundColor: 'var(--paper)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                  minWidth: '220px',
                  overflow: 'hidden',
                  zIndex: 100,
                  color: 'var(--ink)',
                  border: '1px solid var(--line)'
                }}
              >
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--line)', backgroundColor: 'var(--cream)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{user.displayName || 'Campus User'}</div>
                  <div style={{ fontSize: '11px', opacity: 0.7, wordBreak: 'break-all', fontFamily: '"DM Mono", monospace' }}>{user.email}</div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem' }}>
                  <Link href="/my-reports" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '13px', fontWeight: 500, borderRadius: '6px', transition: 'background 0.2s', color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cream)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <FileText size={16} />
                    My Reports
                  </Link>
                  <Link href="/settings" onClick={() => setDropdownOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '13px', fontWeight: 500, borderRadius: '6px', transition: 'background 0.2s', color: 'inherit' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--cream)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Settings size={16} />
                    Account Settings
                  </Link>
                  
                  <div style={{ height: '1px', backgroundColor: 'var(--line)', margin: '0.25rem 0' }} />
                  
                  <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', fontSize: '13px', fontWeight: 500, borderRadius: '6px', transition: 'background 0.2s', color: 'var(--coral)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(233, 109, 89, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <Link href="/login" className="action-link" style={{ fontSize: '12px', fontWeight: 600 }}>
          Sign In
        </Link>
      )}
    </>
  );
}
