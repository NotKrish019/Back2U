'use client';

import Link from 'next/link';
import { Search } from 'lucide-react';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div style={{ 
      minHeight: '75vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      color: 'var(--text-purple)'
    }}>
      <div style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem',
        height: '120px',
        width: '120px'
      }}>
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.1, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            backgroundColor: 'var(--accent-red)',
          }} 
        />
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Search size={56} color="var(--accent-red)" style={{ position: 'relative', zIndex: 1 }} />
        </motion.div>
      </div>

      <h1 style={{ 
        fontFamily: 'var(--font-coolvetica)', 
        fontSize: 'clamp(5rem, 15vw, 8rem)', 
        lineHeight: 1, 
        margin: '0 0 1rem 0',
        color: 'var(--nav-purple)'
      }}>
        404
      </h1>
      
      <p style={{ 
        fontSize: '1.2rem', 
        maxWidth: '450px', 
        opacity: 0.8,
        lineHeight: 1.6,
        marginBottom: '3rem',
        fontWeight: 500
      }}>
        404 — Not found.<br />Guess this one needs Back2U too.
      </p>

      <Link 
        href="/" 
        className="btn" 
        style={{ 
          padding: '1rem 2.5rem', 
          fontSize: '1rem',
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          boxShadow: '0 8px 20px rgba(240, 92, 85, 0.3)'
        }}
      >
        Return to Safety
      </Link>
    </div>
  );
}
