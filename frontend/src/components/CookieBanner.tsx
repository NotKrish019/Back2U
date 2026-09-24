'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { X } from 'lucide-react';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Delay showing the banner slightly for better UX
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted');
    setShowBanner(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookie_consent', 'declined');
    setShowBanner(false);
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0, x: "-50%" }}
          animate={{ y: 0, opacity: 1, x: "-50%" }}
          exit={{ y: 100, opacity: 0, x: "-50%" }}
          transition={{ type: 'spring', stiffness: 260, damping: 25 }}
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            zIndex: 100,
            width: 'calc(100% - 4rem)',
            maxWidth: '800px',
            backgroundColor: 'var(--paper)',
            boxShadow: 'var(--shadow)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--ink)', fontFamily: '"Syne", sans-serif', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.04em' }}>We value your privacy</h3>
              <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. Read our <Link href="/privacy" style={{ color: 'var(--coral)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</Link> for more information.
              </p>
            </div>
            <button 
              onClick={() => setShowBanner(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', padding: '0.25rem' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button 
              onClick={handleDecline}
              style={{ padding: '0.5rem 1rem', background: 'transparent', border: `1px solid var(--line)`, borderRadius: '999px', color: 'var(--ink-soft)', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'background 0.2s var(--ease), border 0.2s var(--ease), transform 0.2s var(--ease)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--cream)'; e.currentTarget.style.borderColor = 'var(--ink)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Decline All
            </button>
            <button 
              onClick={handleAccept}
              style={{ padding: '0.5rem 1.5rem', background: 'var(--coral)', border: '1px solid transparent', borderRadius: '999px', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.035em', textTransform: 'uppercase', transition: 'background 0.2s var(--ease), transform 0.2s var(--ease)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--coral-dark)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--coral)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              Accept All
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
