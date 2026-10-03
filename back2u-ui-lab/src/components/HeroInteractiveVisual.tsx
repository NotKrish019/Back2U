"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const items = [
  "keys?",
  "wallet?",
  "headphones?",
  "phone?",
  "ID card?",
  "water bottle?",
  "laptop?"
];

export default function HeroInteractiveVisual() {
  const [currentItem, setCurrentItem] = useState(0);
  const [hoverState, setHoverState] = useState<'left' | 'right' | null>(null);

  // Rotating text logic
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentItem((prev) => (prev + 1) % items.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center pointer-events-auto">
      
      {/* 2. Desktop Frame & Interactive Canvas */}
      <div className="w-full max-w-[550px] mx-auto animate-[float_8s_ease-in-out_infinite]">
        
        {/* Outer Desktop Window Component */}
        <div className="w-full bg-[#FAF9F6] border-[1.5px] border-black/80 rounded-sm shadow-[0_20px_50px_rgba(51,38,83,0.15)] flex flex-col overflow-hidden transition-transform duration-700 ease-out perspective-[1200px]">
          
          {/* Window Header */}
          <div className="h-6 border-b-[1.5px] border-black/80 flex items-center px-2 bg-white relative">
            {/* Control dots */}
            <div className="flex gap-1.5 absolute left-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#FFB000] border border-black/50" />
            </div>
            {/* Window Title */}
            <div className="w-full text-center text-[9px] font-bold tracking-widest text-black/70 uppercase" style={{ fontFamily: '"Space Mono", monospace' }}>
              BACK2U.EXE
            </div>
          </div>

          {/* Inner Canvas (Image wrapper with 3D tilt) */}
          <div 
            className="relative w-full aspect-[16/9] bg-[#8DB0E6] overflow-hidden transition-transform duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] origin-center"
            style={{ 
              transformStyle: 'preserve-3d', 
              transform: hoverState === 'left' ? 'rotateY(4deg) scale(1.02)' 
                       : hoverState === 'right' ? 'rotateY(-4deg) scale(1.02)' 
                       : 'rotateY(0deg) scale(1)' 
            }}
          >
            {/* Background image heavily cropped via scale to remove baked-in borders/white space */}
            <div className="absolute inset-0 w-full h-full">
              <img 
                src="/retro_hands.jpg" 
                alt="Interactive Canvas" 
                className="w-full h-full object-cover scale-[1.15]" 
                style={{ backfaceVisibility: 'hidden' }}
              />
              {/* Patch to completely hide the baked-in text - fully opaque with no blur to prevent text bleed */}
              <div className="absolute top-[-10%] left-[-10%] right-[-10%] h-[42%] bg-[#f4f3ef] z-10" />
            </div>
            
            {/* Grain Overlay to blend it */}
            <div className="absolute inset-0 bg-black/5 mix-blend-overlay pointer-events-none" />

            {/* Invisible Hitboxes for Routing and Hover */}
            <Link 
              href="/report/lost" 
              className="absolute top-0 left-0 w-1/2 h-full z-30 cursor-pointer outline-none"
              onMouseEnter={() => setHoverState('left')}
              onMouseLeave={() => setHoverState(null)}
              aria-label="Report a lost item"
            />
            
            <Link 
              href="/report/found" 
              className="absolute top-0 right-0 w-1/2 h-full z-30 cursor-pointer outline-none"
              onMouseEnter={() => setHoverState('right')}
              onMouseLeave={() => setHoverState(null)}
              aria-label="Report a found item"
            />
          </div>
        </div>

      </div>
    </div>
  );
}
