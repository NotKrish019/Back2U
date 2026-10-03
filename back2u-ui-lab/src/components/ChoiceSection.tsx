"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CloudShader } from "@/components/ui/cloud-shader";
import { GradientBackground } from "@/components/ui/oceanic-shimmer";

export default function ChoiceSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="w-full relative overflow-hidden z-0">
      {/* Continuous Atmospheric Sky from Hero - Lower opacity to push it into background */}
      <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none opacity-30">
        <CloudShader
          className="h-full w-full scale-105"
          speed={0.45}
          count={3}
          cloudColor="#FFFFFF"
          skyTopColor="#A7D8F5"
          skyBottomColor="#F7F2F7"
        />
      </div>

      {/* Oceanic Shimmer Gradient - Primary visual driver now */}
      <GradientBackground className="absolute inset-0 z-[-15] pointer-events-none opacity-100" />

      {/* Glassy overlay - pure frosted glass without injecting flat solid blue colors */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm -z-10" />
      
      {/* Seamless blend transition into Section 3 */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-b from-transparent to-[#F4F3EF] pointer-events-none -z-5" />
      
      <div className="max-w-7xl mx-auto px-6 pt-32 pb-16 relative z-10">
        <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
          {/* Eyebrow Label */}
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-[var(--color-retro-border)] shadow-[2px_2px_0px_#1A1A1A] mb-8" style={{ fontFamily: '"Space Mono", monospace' }}>
            <span className="w-2 h-2 rounded-full bg-[var(--color-hot-pink)] animate-pulse"></span>
            <span className="text-[11px] font-bold tracking-widest text-deep-purple uppercase">CAMPUS LOST & FOUND</span>
            <span className="text-black/20 text-xs">/</span>
            <span className="text-[11px] text-[var(--color-hot-pink)] font-bold">YOUR_NEXT_MOVE</span>
          </div>

          {/* Headline */}
          <h2 className="text-[clamp(44px,6vw,62px)] leading-[1.05] tracking-tight text-deep-purple font-[800] max-w-3xl mb-6" style={{ fontFamily: '"Newsreader", serif' }}>
            WHAT'S YOUR <span className="italic font-normal text-[var(--color-hot-pink)]">NEXT MOVE?</span>
          </h2>

          {/* Subtitle */}
          <p className="text-body-text text-[18px] md:text-[20px] max-w-2xl mb-12 leading-relaxed" style={{ fontFamily: '"Work Sans", sans-serif' }}>
            Whether something went missing or you found something that isn't yours, you're only a step away from bringing it back.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-20 w-full">
            <Link href="/report/lost" className="px-6 py-3.5 bg-[var(--color-hot-pink)] text-white text-[13px] font-bold tracking-[0.08em] uppercase border-2 border-[var(--color-retro-border)] shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 w-full sm:w-auto" style={{ fontFamily: '"Space Mono", monospace' }}>
              <span>I LOST SOMETHING</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </Link>
            
            <Link href="/report/found" className="px-6 py-3.5 bg-white hover:bg-sky/20 text-deep-purple text-[13px] font-bold tracking-[0.08em] uppercase border-2 border-[var(--color-retro-border)] shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-2 w-full sm:w-auto" style={{ fontFamily: '"Space Mono", monospace' }}>
              <span>I FOUND SOMETHING</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </Link>
          </div>
        </div>

        {/* Main Visual Showcase: Retro OS Window Container */}
        <div 
          ref={containerRef}
          className={`max-w-4xl mx-auto border-2 border-[var(--color-retro-border)] bg-[var(--color-retro-charcoal)] shadow-[6px_6px_0px_#1A1A1A] transition-all duration-1000 ease-out transform motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          {/* Title bar */}
          <div className="bg-[#E5E5E5] px-4 py-2 border-b-2 border-[var(--color-retro-border)] flex items-center justify-between" style={{ fontFamily: '"Space Mono", monospace' }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--color-hot-pink)] border border-[var(--color-retro-border)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#FFD166] border border-[var(--color-retro-border)]"></div>
              <div className="w-3 h-3 rounded-full bg-[#06D6A0] border border-[var(--color-retro-border)]"></div>
              <span className="ml-3 text-[11px] font-bold tracking-tight text-[var(--color-retro-charcoal)] uppercase">BACK2U_SYSTEM_V1.0.EXE</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--color-hot-pink)] text-white text-[10px] border border-[var(--color-retro-border)]">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                [LIVE 60FPS]
              </span>
              <span className="text-[11px] text-deep-purple/70 hidden sm:inline font-bold">REC: 00:48:19:02</span>
            </div>
          </div>
          
          {/* Window Viewport */}
          <div className="relative bg-[#F4F1EB] p-2 sm:p-4 group">
            <div className="relative overflow-hidden border border-[var(--color-retro-border)] aspect-[16/10] bg-sky/30">
              <style jsx>{`
                @keyframes atmospheric-shift {
                  0%, 100% { filter: brightness(1) opacity(1); transform: scale(1.05) translate(0px, 0px); }
                  25% { transform: scale(1.05) translate(-1%, 1%); }
                  50% { filter: brightness(1.02) opacity(0.97); transform: scale(1.05) translate(1%, -1%); }
                  75% { transform: scale(1.05) translate(0.5%, -0.5%); }
                }
                .animate-atmospheric {
                  animation: atmospheric-shift 20s ease-in-out infinite;
                }
                @media (prefers-reduced-motion: reduce) {
                  .animate-atmospheric { animation: none; transform: scale(1); }
                }
              `}</style>
              <img 
                alt="Back2U Campus and Lost Objects Visual" 
                className="w-full h-full object-cover animate-atmospheric transition-transform duration-1000 ease-out group-hover:scale-[1.08] motion-reduce:transition-none motion-reduce:group-hover:scale-100" 
                src="/wide_dreamy_pixelated_mosaic_styled_surreal_illu.png"
              />
              {/* Scanline layer overlay */}
              <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] mix-blend-overlay opacity-60"></div>
            </div>
          </div>
          
          {/* Window Status Footer */}
          <div className="bg-[#E5E5E5]/80 px-4 py-1.5 border-t border-[var(--color-retro-border)] flex items-center justify-between text-[11px] text-deep-purple/70 font-bold" style={{ fontFamily: '"Space Mono", monospace' }}>
            <div className="flex items-center gap-4">
              <span>SYSTEM: ONLINE</span>
              <span className="hidden sm:inline">NODES: 16,384</span>
            </div>
            <div>READY TO COMMENCE</div>
          </div>
        </div>

        </div>
      {/* Section 2 Ending Marquee / Text Strip */}
      <div className="w-full relative z-10 pt-8 pb-20 border-t border-[var(--color-retro-border)]/20 flex flex-col items-center overflow-hidden">
        
        {/* Static Upper Label */}
        <span className="text-[11px] font-bold tracking-widest text-deep-purple/60 uppercase mb-8" style={{ fontFamily: '"Space Mono", monospace' }}>
          CAMPUS LIFE • LOST & FOUND • BACK2U
        </span>

        {/* Moving Marquee Container */}
        <div className="relative w-full overflow-hidden flex">
          <style jsx>{`
            @keyframes marquee-left-right {
              0% { transform: translateX(-50%); }
              100% { transform: translateX(0%); }
            }
            .animate-marquee-left-right {
              animation: marquee-left-right 30s linear infinite;
            }
          `}</style>
          
          <div className="flex min-w-max animate-marquee-left-right">
            {/* 
              Repeat the sequence multiple times to ensure we cover at least 200% width 
              for a seamless left-to-right translation (-50% to 0%).
            */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div 
                key={i} 
                className="flex items-center text-[24px] md:text-[32px] lg:text-[40px] text-deep-purple/50 font-[800] tracking-tighter px-4" 
                style={{ fontFamily: '"Syne", sans-serif' }}
              >
                <span className="px-3">LOST ITEMS</span>
                <span className="text-[var(--color-hot-pink)] text-opacity-80 px-1">•</span>
                <span className="px-3">FOUND ITEMS</span>
                <span className="text-[var(--color-hot-pink)] text-opacity-80 px-1">•</span>
                <span className="px-3">CAMPUS CONNECTIONS</span>
                <span className="text-[var(--color-hot-pink)] text-opacity-80 px-1">•</span>
                <span className="px-3">REUNITING WHAT MATTERS</span>
                <span className="text-[var(--color-hot-pink)] text-opacity-80 px-1">•</span>
                <span className="px-3">BACK2U</span>
                <span className="text-[var(--color-hot-pink)] text-opacity-80 px-1">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
