"use client";

import React, { useRef, useCallback } from "react";
import { CrowdCanvas } from "@/components/ui/skiper39";
import GlyphPortal from "@/components/ui/glyph-portal";

export default function Back2UHero() {
  const crowdLayerRef = useRef<HTMLDivElement>(null);

  const handleProgress = useCallback((progress: number) => {
    if (!crowdLayerRef.current) return;

    // Smoothstep function for cinematic easing
    const smoothstep = (min: number, max: number, value: number) => {
      const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
      return x * x * (3 - 2 * x);
    };

    // Recommended fading logic from instructions
    // progress 0.10–0.75: crowd progressively blurs and fades
    const fadeProgress = smoothstep(0.10, 0.75, progress);
    const blurAmount = fadeProgress * 14; 
    
    // Fades opacity from 1 down to 0-5% 
    const opacityAmount = 1 - smoothstep(0.10, 0.90, progress);

    crowdLayerRef.current.style.setProperty("--crowd-blur", `${blurAmount}px`);
    crowdLayerRef.current.style.setProperty("--crowd-opacity", `${opacityAmount}`);
  }, []);

  return (
    <div className="relative w-full grid">
      {/* CROWD LAYER - Sticky within the grid cell so it stays in view while GlyphPortal scrolls */}
      <div className="col-start-1 row-start-1 w-full h-full pointer-events-none z-0">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <div 
            ref={crowdLayerRef} 
            className="back2u-crowd-layer absolute inset-0 w-full h-full transition-none"
            style={{
              "--crowd-blur": "0px",
              "--crowd-opacity": "1",
              filter: "blur(var(--crowd-blur))",
              opacity: "var(--crowd-opacity)",
              willChange: "filter, opacity"
            } as React.CSSProperties}
          >
            <CrowdCanvas src="/assets/crowd-sprite.png" rows={15} cols={7} />
          </div>
        </div>
      </div>

      {/* GLYPH PORTAL LAYER */}
      <div className="col-start-1 row-start-1 z-10 w-full">
        <GlyphPortal
          word="BACK2U"
          scrollLength={1.8}
          interactive={false}
          annotations={false}
          onProgress={handleProgress}
          style={{
            "--gp-paper": "transparent",
            "--gp-ink": "#000",
            "--gp-foreground": "#fff",
          }}
          background={<div className="absolute inset-0 bg-black" />}
          front={
            <div className="absolute top-[15%] left-1/2 flex -translate-x-1/2 flex-col items-center justify-start gap-4 text-center z-10">
              <p className="text-sm font-light tracking-widest text-black/60 uppercase">
                Find what matters
              </p>
              <div className="mt-4 h-16 w-[1px] bg-gradient-to-b from-black/40 to-transparent"></div>
            </div>
          }
        >
          {/* CONTENT INSIDE THE PORTAL */}
          <div className="flex min-h-screen w-full flex-col items-center justify-center bg-black text-white px-6 text-center">
            {/* The user didn't specify the interior content, so keeping it clean and minimal */}
          </div>
        </GlyphPortal>
      </div>
    </div>
  );
}
