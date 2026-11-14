"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

const WORDS = ["WALLET", "KEYS", "PHONE", "ID CARD", "HEADPHONES", "LAPTOP", "BACKPACK"];

function RotatingHeadline() {
  const [index, setIndex] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    if (mediaQuery.matches) return;

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % WORDS.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-[8%] md:top-[10%] left-0 right-0 z-30 flex flex-col items-center justify-center px-6 pointer-events-none">
      <h2 
        className="text-[28px] sm:text-[36px] md:text-[42px] lg:text-[48px] leading-[1.15] text-deep-purple font-[800] tracking-tight text-center max-w-4xl mx-auto"
        style={{ fontFamily: '"Newsreader", serif' }}
      >
        Lost something? Let’s bring your{" "}
        <span className="relative inline-block text-[var(--color-hot-pink)] font-normal italic text-center align-bottom whitespace-nowrap overflow-hidden">
          {/* Invisible longest word reserves exact space, preventing layout shift */}
          <span className="invisible px-1">HEADPHONES</span>
          <AnimatePresence mode="popLayout">
            <motion.span
              key={WORDS[index]}
              initial={isReducedMotion ? { opacity: 1 } : { y: 30, opacity: 0 }}
              animate={isReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
              exit={isReducedMotion ? { opacity: 0 } : { y: -30, opacity: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center px-1"
            >
              {WORDS[index]}
            </motion.span>
          </AnimatePresence>
        </span>{" "}
        back 2 u.
      </h2>
    </div>
  );
}

export default function Back2UInteractiveSection() {
  const [hoverState, setHoverState] = useState<'left' | 'right' | null>(null);

  return (
    <section className="relative w-full min-h-[100vh] bg-[#F4F3EF] flex flex-col items-center justify-center overflow-hidden z-10">
      
      {/* Dynamic Editorial Headline */}
      <RotatingHeadline />
      
      {/* Seamless blend transition from Section 2 to soften the hard image edge */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#F4F3EF] via-[#F4F3EF]/80 to-transparent pointer-events-none z-20" />

      {/* Seamless blend transition to Section 4 */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#fef9f1] via-[#fef9f1]/80 to-transparent pointer-events-none z-20" />

      {/* Background ambient atmospheric movement */}
      <div className="absolute inset-0 w-full h-full opacity-60 pointer-events-none overflow-hidden">
        <style jsx>{`
          @keyframes drift-1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(5%, 3%) scale(1.05); }
          }
          @keyframes drift-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(-5%, -3%) scale(1.05); }
          }
        `}</style>
        <div className="absolute top-[0%] left-[-10%] w-[70%] h-[70%] bg-[#A7D8F5] blur-[120px] rounded-full mix-blend-multiply opacity-20" style={{ animation: 'drift-1 20s ease-in-out infinite' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[var(--color-hot-pink)] blur-[150px] rounded-full mix-blend-multiply opacity-15" style={{ animation: 'drift-2 25s ease-in-out infinite' }} />
        {/* Subtle CSS grain to match the image's retro texture across the full width */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }} />
      </div>

      {/* The massive interactive visual installation - FULL WIDTH */}
      <div className="relative w-full h-full min-h-[100vh] flex items-center justify-center">
        
        {/* Container for tactile physical interactions */}
        <div className="relative w-full h-full min-h-[100vh] transition-transform duration-1000 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-center">
          {/* 
            White backer for the inner screen to preserve the blue sky colors from multiply darkening.
            Positioned to exactly match the inner BACK2U.EXE screen area of the image.
          */}
          <div className="absolute top-[25%] bottom-[25%] left-[20%] right-[20%] bg-white z-0 hidden md:block" />

          {/* 
            The visual image. Using object-cover ensures it spans the entire width and height 
            without letterboxing, naturally immersing the user.
            mix-blend-multiply seamlessly knocks out the image's baked-in off-white background,
            blending it perfectly into our section background.
          */}
          <img 
            src="/clean_retro_hands.jpg" 
            alt="Interactive Lost and Found Canvas" 
            className="absolute inset-0 w-full h-full object-cover z-10 mix-blend-multiply pointer-events-none" 
            style={{ backfaceVisibility: 'hidden', objectPosition: 'center 40%' }}
          />

          {/* INVISIBLE TACTILE HITBOXES */}
          
          {/* Left Hand Zone -> I LOST SOMETHING -> /report/lost */}
          <Link 
            href="/report/lost" 
            className="absolute top-0 left-0 w-1/2 h-full z-40 cursor-pointer outline-none transition-opacity duration-300 active:bg-black/5"
            onMouseEnter={() => setHoverState('left')}
            onMouseLeave={() => setHoverState(null)}
            aria-label="I lost something"
          />
          
          {/* Right Hand Zone -> I FOUND SOMETHING -> /report/found */}
          <Link 
            href="/report/found" 
            className="absolute top-0 right-0 w-1/2 h-full z-40 cursor-pointer outline-none transition-opacity duration-300 active:bg-black/5"
            onMouseEnter={() => setHoverState('right')}
            onMouseLeave={() => setHoverState(null)}
            aria-label="I found something"
          />

        </div>
      </div>
    </section>
  );
}
