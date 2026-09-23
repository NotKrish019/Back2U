'use client';

import { use } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Search, ZoomIn } from 'lucide-react';

export default function ItemDetail({ params }: { params: Promise<{ id: string }> }) {
  // Use React.use() to unwrap params
  const { id } = use(params);

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 80px)', backgroundColor: 'var(--bg-cream)' }}>
      
      {/* Left Column: Image Area */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
        style={{ flex: 1, backgroundColor: '#D6CFE2', position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, width: '300px', height: '200px', backgroundImage: 'url("https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&q=80")', backgroundSize: 'cover' }}></div>
        
        {/* Overlay gradient at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }} />
        
        <div style={{ position: 'absolute', bottom: '2rem', left: '2rem', color: 'white' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.2rem' }}>FOUND • CENTRAL LIBRARY</div>
          <div style={{ fontSize: '0.65rem', opacity: 0.8, letterSpacing: '0.05em' }}>TODAY • 12:42 PM</div>
        </div>
        
        <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', display: 'flex', gap: '0.5rem' }}>
          <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid white', background: 'transparent', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Search size={14} /></button>
          <button style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid white', background: 'transparent', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><ZoomIn size={14} /></button>
        </div>
      </motion.div>

      {/* Right Column: Details Area */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
        style={{ flex: 1, padding: '4rem', display: 'flex', flexDirection: 'column' }}
      >
        <Link href="/search" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-purple)', fontSize: '0.85rem', marginBottom: '3rem', fontWeight: 500 }}>
          <ArrowLeft size={16} /> Back to possible matches
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <span style={{ backgroundColor: 'var(--accent-red)', color: 'white', padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.05em' }}>STRONG VISUAL MATCH</span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8C8797' }}>ITEM DETAIL</span>
        </div>

        <h1 className="heading-xl" style={{ fontSize: '4rem', marginBottom: '2rem' }}>BLACK NIKE<br/>BACKPACK</h1>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8C8797', marginBottom: '0.2rem' }}>STATUS</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>FOUND</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8C8797', marginBottom: '0.2rem' }}>LOCATION</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>CENTRAL LIBRARY</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8C8797', marginBottom: '0.2rem' }}>DATE</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>TODAY • 12:42 PM</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: '#8C8797', marginBottom: '0.2rem' }}>CATEGORY</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>BAGS</div>
          </div>
        </div>

        <p className="body-text" style={{ marginBottom: '3rem' }}>
          Black Nike backpack with a small orange keychain on the front pocket. {id}
        </p>

        {/* Why this may be a match block */}
        <div style={{ border: '1px solid var(--border-color)', borderRadius: '4px', padding: '1.5rem', marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
            <span>WHY THIS MAY BE A MATCH</span>
            <span>↓</span>
          </div>
          <div className="grid grid-cols-3">
            {[
              "Black exterior",
              "Front pocket",
              "Orange keychain detail"
            ].map(reason => (
              <div key={reason}>
                <Check size={16} color="var(--accent-red)" style={{ marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.85rem', color: 'var(--text-purple)' }}>{reason}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: 'auto' }}>
          <button className="btn btn-primary" style={{ backgroundColor: 'var(--text-dark)' }}>
            COMPARE WITH MY ITEM <ArrowRight size={16} style={{ marginLeft: '8px' }} />
          </button>
          <button className="btn btn-outline" style={{ backgroundColor: 'white' }}>
            Not mine
          </button>
        </div>
        <p className="caption" style={{ marginTop: '1rem' }}>Messages stay inside Back2U. Meet in a public place.</p>
      </motion.div>
    </div>
  );
}
