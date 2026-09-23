'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const MOCK_DATA = [
  { 
    img: '/mocks/mock_backpack_1790169091092.jpg', desc: 'BLACK NIKE BACKPACK', loc: 'CENTRAL LIBRARY',
    photoPos: { top: '20%', left: '20%' }, locPos: { top: '55%', left: '80%' }, descPos: { top: '80%', left: '30%' }
  },
  { 
    img: '/mocks/mock_bottle_1790169172963.jpg', desc: 'SILVER WATER BOTTLE', loc: 'GYM',
    photoPos: { top: '75%', left: '20%' }, locPos: { top: '25%', left: '70%' }, descPos: { top: '60%', left: '80%' }
  },
  { 
    img: '/mocks/mock_headphones_1790169189094.jpg', desc: 'WIRELESS HEADPHONES', loc: 'CAFE',
    photoPos: { top: '25%', left: '80%' }, locPos: { top: '60%', left: '15%' }, descPos: { top: '85%', left: '60%' }
  },
  { 
    img: '/mocks/mock_keys_1790169205948.jpg', desc: 'KEYS ON LANYARD', loc: 'SCIENCE BLDG',
    photoPos: { top: '65%', left: '80%' }, locPos: { top: '20%', left: '20%' }, descPos: { top: '80%', left: '20%' }
  },
  { 
    img: '/mocks/mock_notebook_1790169229644.jpg', desc: 'BLACK NOTEBOOK', loc: 'QUAD',
    photoPos: { top: '40%', left: '15%' }, locPos: { top: '80%', left: '75%' }, descPos: { top: '15%', left: '60%' }
  },
  { 
    img: '/mocks/mock_calculator_1790169293752.jpg', desc: 'GRAPHING CALCULATOR', loc: 'MATH HALL',
    photoPos: { top: '80%', left: '50%' }, locPos: { top: '30%', left: '20%' }, descPos: { top: '30%', left: '80%' }
  },
  { 
    img: '/mocks/mock_phone_1790169310833.jpg', desc: 'SMARTPHONE', loc: 'STUDENT UNION',
    photoPos: { top: '15%', left: '50%' }, locPos: { top: '75%', left: '25%' }, descPos: { top: '65%', left: '75%' }
  },
  { 
    img: '/mocks/mock_wallet_1790169324604.jpg', desc: 'LEATHER WALLET', loc: 'DINING HALL',
    photoPos: { top: '50%', left: '80%' }, locPos: { top: '20%', left: '50%' }, descPos: { top: '75%', left: '25%' }
  },
];

function SearchLens() {
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % MOCK_DATA.length);
    }, 5000); // Cycle item every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const activeItem = MOCK_DATA[activeIndex];

  return (
    <Link href="/select-action" style={{ display: 'block', height: '100%', textDecoration: 'none' }}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.8, delay: 0.2 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ 
          height: '700px', 
          backgroundColor: 'var(--card-purple)', 
          position: 'relative', 
          display: 'flex', 
          flexDirection: 'column', 
          padding: '2rem', 
          color: 'var(--white)',
          overflow: 'hidden',
          cursor: 'pointer'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', zIndex: 10, position: 'relative' }}>
          <span>BACK2U SEARCH</span>
          <div style={{ width: '20px', height: '20px', border: '1px solid rgba(255,255,255,0.5)' }}></div>
        </div>

        {/* Radar & Sonar Animated Background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          
          {/* Radar Sweep */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            style={{ 
              position: 'absolute', 
              width: '1200px', 
              height: '1200px', 
              background: 'conic-gradient(from 0deg, transparent 65%, rgba(229, 192, 95, 0.05) 80%, rgba(240, 92, 85, 0.3) 100%)', 
              borderRadius: '50%' 
            }}
          />

          {/* Pulsing Sonar Rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ scale: [1, 2.5], opacity: [0.4, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeOut", delay: i * 1.5 }}
              style={{ 
                position: 'absolute', 
                width: '320px', 
                height: '320px', 
                border: '1px solid rgba(255,255,255,0.5)', 
                borderRadius: '50%' 
              }}
            />
          ))}

          {/* Target Crosshairs */}
          <div style={{ position: 'absolute', width: '100%', height: '1px', backgroundColor: 'rgba(255,255,255,0.05)' }} />
          <div style={{ position: 'absolute', width: '1px', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' }} />
        </div>

        {/* Abstract Background Grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.15, backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)', backgroundSize: '40px 40px', zIndex: 1 }} />

        {/* The Search Lens Center */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
          
          {/* Main Lens Ring */}
          <motion.div 
            animate={isHovered ? { scale: 1.05, borderColor: 'rgba(255,255,255,0.5)' } : { scale: [1, 1.02, 1], borderColor: 'rgba(255,255,255,0.15)' }}
            transition={isHovered ? { duration: 0.3 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
            style={{ width: '320px', height: '320px', borderRadius: '50%', border: '1px solid', position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
             <motion.div 
               animate={isHovered ? { opacity: 0 } : { opacity: [0.5, 1, 0.5] }}
               transition={isHovered ? { duration: 0.3 } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
               style={{ fontSize: '0.85rem', letterSpacing: '0.2em', fontWeight: 600, zIndex: 2 }}
             >
               FIND A MATCH
             </motion.div>
          </motion.div>

          {/* Hover state reveal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1 : 0.95 }}
            transition={{ duration: 0.3 }}
            style={{ position: 'absolute', fontSize: '1.2rem', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--white)' }}
          >
            START SEARCH →
          </motion.div>

          {/* Synchronized Dynamic Nodes */}
          <AnimatePresence mode="popLayout">
            {!isHovered && (
              <motion.div
                key={activeIndex}
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { 
                    opacity: 1, 
                    transition: { staggerChildren: 0.3, delayChildren: 0.2 } 
                  },
                  exit: { opacity: 0, transition: { duration: 0.5 } }
                }}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
              >
                {/* PHOTO node */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, scale: 0.8, filter: 'brightness(2)' },
                    visible: { opacity: 1, scale: 1, filter: 'brightness(1)', transition: { duration: 0.6, type: 'spring' } }
                  }}
                  style={{ position: 'absolute', top: activeItem.photoPos.top, left: activeItem.photoPos.left, display: 'flex', alignItems: 'center', transform: 'translate(-50%, -50%)', zIndex: 10 }}
                >
                  <div style={{ width: '110px', height: '110px', borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <img src={activeItem.img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Mock item" />
                  </div>
                </motion.div>

                {/* LOCATION node */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: 20 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
                  }}
                  style={{ position: 'absolute', top: activeItem.locPos.top, left: activeItem.locPos.left, display: 'flex', alignItems: 'center', gap: '0.5rem', transform: 'translate(-50%, -50%)', zIndex: 10 }}
                >
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textShadow: '0 2px 4px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>{activeItem.loc}</span>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#E5C05F', boxShadow: '0 0 10px #E5C05F' }} />
                </motion.div>

                {/* DESCRIPTION node */}
                <motion.div 
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
                  }}
                  style={{ position: 'absolute', top: activeItem.descPos.top, left: activeItem.descPos.left, display: 'flex', alignItems: 'center', gap: '0.5rem', transform: 'translate(-50%, -50%)', zIndex: 10 }}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--white)', boxShadow: '0 0 10px var(--white)' }} />
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textShadow: '0 2px 4px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>{activeItem.desc}</span>
                </motion.div>

                {/* Scanline effect synced with the item's lifetime */}
                <motion.div
                  variants={{
                    hidden: { top: '0%', opacity: 0 },
                    visible: { top: '100%', opacity: [0, 1, 1, 0], transition: { duration: 4.5, ease: "linear" } }
                  }}
                  style={{ position: 'absolute', left: 0, right: 0, height: '1px', backgroundColor: 'rgba(255,255,255,0.2)', boxShadow: '0 0 10px rgba(255,255,255,0.3)' }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div style={{ marginTop: 'auto', fontSize: '0.65rem', letterSpacing: '0.1em', opacity: 0.7, zIndex: 10, position: 'relative' }}>
          MULTIMODAL INSTANCE RETRIEVAL
        </div>
      </motion.div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      
      {/* Hero Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', marginBottom: '6rem' }}>
        
        {/* Left Column */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="subheading">Campus Lost & Found</span>
          <h1 className="heading-xl">
            LOST SOMETHING?<br/>LET'S FIND IT.
          </h1>
          <p className="body-text" style={{ maxWidth: '400px', marginBottom: '4rem', fontSize: '1.25rem' }}>
            A thoughtful way to find what belongs to you — or help return what someone else has lost.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
            <Link href="/report?type=lost" style={{ display: 'block', textDecoration: 'none' }}>
              <motion.div 
                whileHover="hover"
                initial="initial"
                style={{ padding: '1.5rem', margin: '-1.5rem', border: '1px solid transparent', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s, border-color 0.3s' }}
                variants={{
                  hover: { backgroundColor: 'rgba(240, 92, 85, 0.04)', borderColor: 'rgba(240, 92, 85, 0.2)' }
                }}
              >
                <span className="subheading" style={{ color: 'var(--accent-red)' }}>01</span>
                <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>I LOST SOMETHING</h3>
                <p className="caption" style={{ marginBottom: '1.5rem', color: 'var(--text-purple)' }}>Find an item that belongs to you.</p>
                <motion.div 
                  style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--accent-red)' }}
                  variants={{ hover: { x: 4 } }}
                >
                  START SEARCHING <ArrowUpRight size={16} style={{ marginLeft: '4px' }} />
                </motion.div>
              </motion.div>
            </Link>

            <Link href="/report?type=found" style={{ display: 'block', textDecoration: 'none' }}>
              <motion.div 
                whileHover="hover"
                initial="initial"
                style={{ padding: '1.5rem', margin: '-1.5rem', border: '1px solid transparent', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s, border-color 0.3s' }}
                variants={{
                  hover: { backgroundColor: 'rgba(229, 192, 95, 0.06)', borderColor: 'rgba(229, 192, 95, 0.3)' }
                }}
              >
                <span className="subheading" style={{ color: '#E5A05F' }}>02</span>
                <h3 className="heading-md" style={{ marginBottom: '0.5rem' }}>I FOUND SOMETHING</h3>
                <p className="caption" style={{ marginBottom: '1.5rem', color: 'var(--text-purple)' }}>Help return an item to its owner.</p>
                <motion.div 
                  style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', color: '#E5A05F' }}
                  variants={{ hover: { x: 4 } }}
                >
                  REPORT AN ITEM <ArrowUpRight size={16} style={{ marginLeft: '4px' }} />
                </motion.div>
              </motion.div>
            </Link>
          </div>
        </motion.div>

        {/* Right Column: Dynamic Search Lens */}
        <SearchLens />
      </div>

      {/* Campus Signal */}
      <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1.5rem 0', display: 'flex', alignItems: 'center', gap: '3rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', color: '#8C8797', textTransform: 'uppercase', marginBottom: '6rem' }}>
        <span style={{ color: 'var(--accent-red)' }}>CAMPUS SIGNAL</span>
        <span>12 NEW REPORTS TODAY</span>
        <span>•</span>
        <span>48 ITEMS FOUND THIS WEEK</span>
        <span>•</span>
        <span>3 RECENTLY RETURNED</span>
      </div>

      {/* How It Works */}
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '3rem' }}>
          <div>
            <span className="subheading">A SIMPLE WAY BACK</span>
            <h2 className="heading-lg">HOW IT WORKS</h2>
          </div>
          <p className="body-text" style={{ maxWidth: '300px', fontSize: '0.9rem' }}>
            A few useful details are often all it takes to get an item moving home.
          </p>
        </div>

        <div className="grid grid-cols-3">
          {[
            { step: '01', title: 'SHOW US THE ITEM', desc: 'Upload a photo or tell us what it looks like.', img: '/mocks/step1.jpg' },
            { step: '02', title: 'TELL US WHAT YOU REMEMBER', desc: 'Add details like location, colour or time.', img: '/mocks/step2.jpg' },
            { step: '03', title: 'REVIEW POSSIBLE MATCHES', desc: 'Compare the results and decide what looks right.', img: '/mocks/step3.jpg' }
          ].map((item, i) => (
            <motion.div 
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.6 }}
            >
              <span className="subheading" style={{ color: '#E5A05F' }}>{item.step}</span>
              <motion.div 
                whileHover="hover"
                initial="initial"
                style={{ width: '100%', aspectRatio: '700/420', backgroundColor: 'var(--card-purple)', marginBottom: '1.5rem', overflow: 'hidden', borderRadius: '8px', cursor: 'pointer' }}
              >
                <motion.img 
                  src={item.img} 
                  alt={item.title} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  variants={{
                    initial: { scale: 1 },
                    hover: { scale: 1.05 }
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </motion.div>
              <h3 className="heading-md" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p className="caption">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
