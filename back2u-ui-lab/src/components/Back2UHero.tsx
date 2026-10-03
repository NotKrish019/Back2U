"use client";

import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CrowdCanvas } from "@/components/ui/skiper39";
import { CloudShader } from "@/components/ui/cloud-shader";
import { ArrowRight, ArrowUpRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Back2UHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const crowdRef = useRef<HTMLDivElement>(null);
  
  const [footnoteItem, setFootnoteItem] = useState("wallet");
  const items = ["wallet", "keys", "phone", "ID card", "headphones"];
  const [hoverState, setHoverState] = useState<'left' | 'right' | null>(null);
  
  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % items.length;
      setFootnoteItem(items[index]);
    }, 2500);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    if (!containerRef.current || !titleContainerRef.current) return;

    // Accessibility: Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    // No scroll trigger needed, we will use native sticky scrolling for the overlap.
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[calc(100dvh-100px)]"
    >
      {/* ATMOSPHERIC SKY (needs overflow-hidden so shader doesn't bleed) */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
        style={{ 
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)', 
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)' 
        }}
      >
        <CloudShader
          className="h-full w-full scale-105"
          speed={0.45}
          count={6}
          cloudColor="#FFFFFF"
          skyTopColor="#C5B5E8"
          skyBottomColor="#A7D8F5"
        />
      </div>

      {/* CROWD CANVAS LAYER & REFLECTION (Z-20) */}
      <div ref={crowdRef} className="absolute inset-0 w-full h-full pointer-events-none z-20 overflow-hidden">
        <CrowdCanvas count={35} />
      </div>

      {/* BRANDING TITLE (Z-30: Left aligned layout matching main website) */}
      <div 
        ref={titleContainerRef}
        className="absolute top-[4%] md:top-[6%] left-[5%] md:left-[8%] w-[90%] md:w-[50%] flex flex-col items-start z-30 pointer-events-none"
      >
        {/* Top Header Badge */}
        <div className="flex items-center gap-3 mb-4 md:mb-6 font-[800] tracking-[0.1em] text-[10px] md:text-[11px] uppercase text-mid-plum" style={{ fontFamily: '"Space Mono", monospace' }}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-hot-pink)]"></span>
            Campus lost & found
          </div>
          <div className="bg-dark-plum text-white px-2 py-0.5 rounded-sm">
            EST. 2026
          </div>
        </div>

        {/* Massive Typography */}
        <h1 
          className="flex flex-col leading-[0.95] text-[clamp(45px,6vw,90px)] font-[800] tracking-tight" 
          style={{ fontFamily: '"Newsreader", serif' }}
        >
          <span className="text-dark-plum flex flex-col" style={{ textShadow: "0 3px 10px rgba(51, 38, 83, 0.15)" }}>
            <span>LOST</span>
            <span className="text-deep-plum">SOMETHING?</span>
          </span>
          <span className="text-[var(--color-hot-pink)] mt-2 md:mt-3 italic flex flex-col" style={{ textShadow: "0 3px 10px rgba(51, 38, 83, 0.18)" }}>
            <span>LET'S GET</span>
            <span className="flex flex-wrap items-end gap-x-[12px] md:gap-x-[16px] leading-[0.95]">
              <span>IT</span>
              {/* Logo Style "BACK2U." */}
              <span className="relative inline-flex items-center text-deep-plum tracking-tight not-italic leading-[0.8] mb-[2px] md:mb-[4px]" style={{ textShadow: "0 3px 10px rgba(51, 38, 83, 0.15)" }}>
                <span>BACK</span>
                <span className="text-[var(--color-hot-pink)] text-[clamp(50px,6.5vw,100px)] -rotate-8 inline-block mx-[2px]" style={{ textShadow: "0 3px 10px rgba(51, 38, 83, 0.18)" }}>2</span>
                <span>U</span>
                <i className="w-[clamp(10px,1.5vw,16px)] h-[clamp(10px,1.5vw,16px)] ml-[6px] md:ml-[10px] mt-[30px] md:mt-[45px] bg-[var(--color-hot-pink)] rounded-full inline-block shadow-[0_3px_10px_rgba(51,38,83,0.18)]" />
              </span>
            </span>
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-8 md:mt-12 text-body-text max-w-[400px] text-[14px] md:text-[16px] font-medium leading-relaxed" style={{ fontFamily: '"Work Sans", sans-serif' }}>
          Find what belongs to you — or help return what someone else lost.
        </p>

        {/* Animated Footnote (Moved up since buttons are removed) */}
        <div className="mt-6 md:mt-8 flex items-center gap-2 text-[12px] md:text-[13px] text-body-text font-medium" style={{ fontFamily: '"Work Sans", sans-serif' }}>
          <div className="relative flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-[var(--color-hot-pink)]/20 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-hot-pink)]"></span>
            </span>
          </div>
          Reuniting you with your <span className="text-[var(--color-hot-pink)] font-bold transition-all duration-300">{footnoteItem}</span>
        </div>
      </div>

      {/* RIGHT SIDE FLOATING PHONE (Z-30) */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes floatPhone {
          0%, 100% { transform: translateY(0px) rotate(-12deg); }
          50% { transform: translateY(-16px) rotate(-10deg); }
        }
      `}} />
      <div className="absolute top-[50%] sm:top-[45%] md:top-[35%] left-[50%] md:left-auto md:right-[2%] lg:right-[5%] xl:right-[8%] -translate-x-1/2 md:-translate-x-0 -translate-y-1/2 md:-translate-y-1/2 w-[40%] sm:w-[30%] md:w-[25%] lg:w-[20%] max-w-[180px] md:max-w-[200px] z-30 pointer-events-none flex items-center justify-center">
         <div 
           className="relative w-full aspect-[261/531] rounded-[15%] md:rounded-[36px] shadow-[-20px_35px_60px_rgba(33,28,43,0.45)] overflow-hidden bg-[#211C2B]" 
           style={{ animation: "floatPhone 8s ease-in-out infinite" }}
         >
             <img 
               src="/mobile.gif" 
               alt="Back2U Mobile Interface" 
               className="absolute w-[306.51%] h-[112.99%] top-[-6.40%] left-[-103.06%] object-fill max-w-none" 
             />
         </div>
      </div>
    </div>
  );
}
