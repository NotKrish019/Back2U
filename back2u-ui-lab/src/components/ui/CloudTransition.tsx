'use client';
import React from 'react';

export default function CloudTransition() {
  return (
    <div className="absolute inset-x-0 bottom-[-150px] md:bottom-[-200px] h-[300px] w-full pointer-events-none z-40 overflow-visible flex items-end">
      {/* 
        The SVG needs to be a cloud shape that:
        1. Has a crisp organic top
        2. Has a soft, feathered bottom that fades to transparent
        3. Fades to the background
      */}
      <svg 
        viewBox="0 0 1440 320" 
        preserveAspectRatio="none" 
        className="w-[150%] md:w-full h-full relative left-[-25%] md:left-0"
      >
        <defs>
          {/* 
            Mask to feather the bottom edge organically 
            It fades out the lower half of the SVG so there is no hard horizontal cut
          */}
          <linearGradient id="bottom-feather" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="50%" stopColor="white" stopOpacity="0.95" />
            <stop offset="85%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>

          {/* 
            Soft Lavender Glow/Fringe
            A diffuse blur applied to a slightly larger/lower shape 
          */}
          <filter id="lavender-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="15" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Layer 1: Soft Lavender Atmosphere (glow) */}
        <path 
          d="M0,150 C80,190 160,110 240,140 C320,170 400,100 500,130 C600,160 700,80 800,120 C900,160 1000,90 1100,140 C1200,190 1300,130 1440,160 L1440,220 C1320,290 1200,200 1080,260 C960,320 840,220 720,280 C600,340 480,230 360,290 C240,350 120,250 0,280 Z" 
          fill="#C5B5E8"
          opacity="0.6"
          filter="url(#lavender-glow)"
          mask="url(#bottom-feather)"
          transform="translate(0, 40)"
        />

        {/* Layer 2: Main Crisp White Cloud */}
        <path 
          d="M0,150 C80,190 160,110 240,140 C320,170 400,100 500,130 C600,160 700,80 800,120 C900,160 1000,90 1100,140 C1200,190 1300,130 1440,160 L1440,220 C1320,290 1200,200 1080,260 C960,320 840,220 720,280 C600,340 480,230 360,290 C240,350 120,250 0,280 Z" 
          fill="#FFFFFF"
          mask="url(#bottom-feather)"
        />
      </svg>
    </div>
  );
}
