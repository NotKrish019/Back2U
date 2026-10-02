"use client";

import React from "react";
import { CrowdCanvas } from "@/components/ui/skiper39";
import { CloudShader } from "@/components/ui/cloud-shader";

export default function Back2UHero() {
  return (
    <div className="relative w-full h-[100svh] overflow-hidden bg-sky">
      {/* ATMOSPHERIC SKY & CLOUDS (BACKGROUND) */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <CloudShader
          className="h-full w-full"
          speed={0.45}
          count={6}
          cloudColor="#FFFFFF"
          skyTopColor="#C5B5E8"
          skyBottomColor="#A7D8F5"
        />
      </div>

      {/* SUBTLE GROUND/HORIZON HAZE */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-sky/60 to-transparent pointer-events-none z-10"></div>

      {/* CROWD CANVAS LAYER (MIDGROUND) */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
        <CrowdCanvas count={35} />
      </div>

      {/* SIMPLE BACK2U BRANDING (FOREGROUND) */}
      <div className="absolute inset-0 flex flex-col items-center justify-start pt-[15%] z-30 pointer-events-none text-center">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-deep-purple uppercase drop-shadow-md">
          BACK2U
        </h1>
        <p className="mt-4 text-sm font-light tracking-widest text-deep-purple/80 uppercase drop-shadow-sm">
          Find what matters
        </p>
        <div className="mt-8 h-16 w-[1px] bg-gradient-to-b from-deep-purple/60 to-transparent"></div>
      </div>
    </div>
  );
}
