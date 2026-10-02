"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CloudShader } from "@/components/ui/cloud-shader";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Back2UNotFound() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reducedMotion) return;
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    const y = (e.clientY / window.innerHeight - 0.5) * 2; // -1 to 1
    setMousePos({ x, y });
  };

  return (
    <div 
      className="relative w-full h-[100dvh] overflow-hidden bg-sky select-none pt-[76px]"
      onMouseMove={handleMouseMove}
    >
      {/* SKY BACKGROUND */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <CloudShader
          className="h-full w-full scale-105"
          speed={0.45}
          count={6}
          cloudColor="#FFFFFF"
          skyTopColor="#C5B5E8"
          skyBottomColor="#A7D8F5"
        />
      </div>

      {/* HAZE */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-sky via-sky/80 to-transparent pointer-events-none z-10" />

      {/* TOP TEXT (ABSOLUTE) */}
      <div className="absolute top-[12vh] md:top-[16vh] left-1/2 -translate-x-1/2 z-40 w-full flex flex-col items-center pointer-events-none text-center px-4">
        <div className="inline-flex items-center justify-center gap-[10px] uppercase tracking-[0.15em] text-[10px] md:text-[11px] font-[700] text-deep-plum/70 mb-4">
          <span className="w-[6px] h-[6px] rounded-full bg-accent-pink" />
          ERROR 404
        </div>
        <h1 
          className="text-[clamp(30px,4vw,60px)] font-[800] leading-[1.1] tracking-[-0.04em] text-deep-plum"
          style={{ fontFamily: '"Syne", sans-serif' }}
        >
          Looks like you wandered off campus.
        </h1>
      </div>

      {/* SCENE CONTAINER */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden">
        
        {/* BACKGROUND ELEMENTS (Parallax Layer 1) */}
        <motion.div 
          className="absolute inset-0"
          animate={{ x: mousePos.x * -6, y: mousePos.y * -6 }}
          transition={{ type: "spring", stiffness: 100, damping: 30 }}
        >
          {/* Giant 404 embedded in environment (CENTERED) */}
          <div 
            className="absolute top-[42vh] left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 md:gap-4 font-[800] text-[25vw] md:text-[22vh] leading-none z-10" 
            style={{ fontFamily: '"Syne", sans-serif' }}
          >
            <span className="text-deep-plum drop-shadow-2xl" style={{ textShadow: "0 20px 40px rgba(51, 38, 83, 0.15)" }}>4</span>
            
            <div className="relative flex items-center justify-center">
              <span className="text-lavender drop-shadow-xl" style={{ textShadow: "0 20px 40px rgba(197, 181, 232, 0.4)" }}>0</span>
              <div className="absolute inset-0 rounded-full border-[4px] md:border-[8px] border-accent-pink/30 scale-[0.6] blur-[2px]" />
            </div>
            
            <span className="text-deep-plum drop-shadow-2xl relative" style={{ textShadow: "0 20px 40px rgba(51, 38, 83, 0.15)" }}>
              4
              <span className="absolute inset-0 text-accent-pink opacity-90 drop-shadow-md" style={{ clipPath: "polygon(0 45%, 100% 45%, 100% 55%, 0 55%)" }}>4</span>
            </span>
          </div>

          {/* Paper-cut Background Buildings (MOVED TO BOTTOM RIGHT) */}
          <svg className="absolute bottom-[5vh] md:bottom-[10vh] right-[0%] md:-right-[5%] w-[100vw] md:w-[65vw] max-w-[900px] h-auto opacity-80 overflow-visible" viewBox="0 0 400 200" fill="none" style={{ filter: 'drop-shadow(0px 15px 30px rgba(51,38,83,0.1))' }}>
            <path d="M-50 200 L450 200 L450 150 C 300 130, 100 160, -50 150 Z" fill="#C5B5E8" opacity="0.3" />
            <path d="M50 200 L50 80 L120 40 L190 80 L190 200 Z" fill="#C5B5E8" />
            <path d="M150 200 L150 120 L250 80 L350 120 L350 200 Z" fill="#4A3B73" opacity="0.6" />
            <path d="M80 120 h20 v30 h-20 z" fill="#FFF9FC" opacity="0.4" />
            <path d="M120 120 h20 v30 h-20 z" fill="#FFF9FC" opacity="0.4" />
            <path d="M200 150 h20 v30 h-20 z" fill="#FFF9FC" opacity="0.4" />
            <path d="M260 150 h20 v30 h-20 z" fill="#FFF9FC" opacity="0.4" />
          </svg>
        </motion.div>

        {/* MIDGROUND ELEMENTS (Parallax Layer 2 - BOTTOM RIGHT CORNER) */}
        <motion.div
          className="absolute inset-0"
          animate={{ x: mousePos.x * -12, y: mousePos.y * -12 }}
          transition={{ type: "spring", stiffness: 100, damping: 30 }}
        >
          {/* Winding Path */}
          <svg className="absolute -right-[10%] md:-right-[5%] -bottom-[10%] w-[60vw] md:w-[40vw] h-auto" viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: 'drop-shadow(0px 10px 15px rgba(51,38,83,0.15))' }}>
            <path d="M0 300 C 100 250, 150 280, 250 200 C 350 120, 300 80, 400 50" stroke="#FFF9FC" strokeWidth="40" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
            <path d="M0 300 C 100 250, 150 280, 250 200 C 350 120, 300 80, 400 50" stroke="#EFA0B5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="10 15" opacity="0.6" />
          </svg>

          {/* Trees */}
          <svg className="absolute right-[25%] md:right-[20%] bottom-[5%] w-[8vw] md:w-[6vw] h-auto" viewBox="0 0 100 150" fill="none" style={{ filter: 'drop-shadow(0px 8px 15px rgba(51,38,83,0.15))' }}>
            <path d="M45 150 L45 80 L55 80 L55 150 Z" fill="#4A3B73" />
            <circle cx="50" cy="50" r="45" fill="#8DA399" />
            <circle cx="35" cy="40" r="25" fill="#7D9893" />
            <circle cx="65" cy="60" r="20" fill="#7D9893" />
          </svg>

          <svg className="absolute right-[2%] md:right-[2%] bottom-[12%] w-[6vw] md:w-[4vw] h-auto" viewBox="0 0 100 150" fill="none" style={{ filter: 'drop-shadow(0px 8px 15px rgba(51,38,83,0.15))' }}>
            <path d="M45 150 L45 80 L55 80 L55 150 Z" fill="#4A3B73" />
            <circle cx="50" cy="50" r="45" fill="#C5B5E8" />
            <circle cx="60" cy="45" r="25" fill="#EFA0B5" opacity="0.8" />
          </svg>

          {/* Campus Sign */}
          <div className="absolute right-[18%] md:right-[15%] bottom-[12%] flex flex-col items-center drop-shadow-xl scale-75 md:scale-90 origin-bottom">
            <div className="w-2 h-24 bg-deep-plum rounded-sm relative">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 bg-white rounded-md p-2 shadow-lg border border-sky flex flex-col items-center gap-1 origin-bottom rotate-[-5deg]">
                <span className="text-[8px] font-bold text-deep-plum tracking-wider uppercase text-center">Wrong Campus</span>
                <motion.div 
                  animate={{ x: [-2, 2, -2] }} 
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="text-accent-pink font-bold text-[12px]"
                >
                  ← HOME
                </motion.div>
              </div>
            </div>
          </div>

          {/* Student Illustration & Animation */}
          <motion.div
            className="absolute right-[5%] md:right-[8%] bottom-[2%] md:bottom-[5%] w-[80px] md:w-[120px] origin-bottom drop-shadow-2xl"
            animate={{
              x: ["0%", "-150%", "-150%", "-150%", "-150%", "-150%", "-150%", "-150%", "0%"],
              y: [0, -10, 0, -10, 0, -5, 0, -5, 0], // Subtle walking bob
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
              times: [0, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1]
            }}
          >
            <motion.img 
              src="/assets/peeps/peep_1.png" 
              alt="Wandering student" 
              className="w-full h-auto object-contain"
              animate={{
                scaleX: [-1, -1, -1, 1, 1, -1, -1, 1, 1],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "stepEnd",
                times: [0, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1]
              }}
              style={{ clipPath: "inset(0 0 5% 0)" }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* BUTTONS (ABSOLUTE BELOW 404) */}
      <div className="absolute top-[58vh] left-1/2 -translate-x-1/2 z-40 flex flex-col sm:flex-row items-center justify-center gap-6 pointer-events-auto">
        <Link 
          href="/"
          className="group relative flex items-center justify-center gap-2 bg-deep-plum text-white px-8 py-4 rounded-full font-bold text-[14px] overflow-hidden transition-all hover:bg-mid-plum hover:shadow-[0_8px_25px_rgba(51,38,83,0.3)]"
        >
          Back to campus
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
        
        <Link 
          href="/"
          className="group font-bold text-[14px] text-deep-plum hover:text-accent-pink transition-colors flex items-center justify-center gap-2"
        >
          Go home
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-0 h-[2px] bg-accent-pink transition-all group-hover:w-full" />
        </Link>
      </div>
    </div>
  );
}
