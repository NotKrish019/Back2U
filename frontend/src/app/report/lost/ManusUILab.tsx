'use client';
import { ArrowUpRight } from 'lucide-react';
import React from 'react';

// Exact same structural API as the production ManusUI, but themed with UI Lab visuals.

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div className={`flex items-center gap-2 font-['Space_Mono'] text-[10px] tracking-widest uppercase opacity-60 mb-6 ${light ? "opacity-40" : ""}`}>
      <span className="w-2 h-2 rounded-full bg-[var(--color-hot-magenta)]" />
      {children}
    </div>
  );
}

export function ActionLink({ children, onClick, light = false }: { children: React.ReactNode; onClick?: () => void; light?: boolean }) {
  return (
    <button className={`flex items-center gap-1 font-['Space_Mono'] text-xs tracking-widest uppercase hover:text-[var(--color-hot-magenta)] transition-colors ${light ? "opacity-70" : ""}`} onClick={onClick}>
      {children}
      <ArrowUpRight size={17} strokeWidth={1.6} />
    </button>
  );
}

export function Button({ children, onClick, variant = "solid", icon, type = "button" }: { children: React.ReactNode; onClick?: () => void; variant?: "solid" | "outline" | "dark" | "text"; icon?: React.ReactNode; type?: "button" | "submit" }) {
  const baseStyle = "inline-flex items-center justify-center gap-2 px-8 py-4 font-['Space_Mono'] text-xs tracking-widest uppercase transition-colors";
  
  let variantStyle = "";
  if (variant === "solid") {
    variantStyle = "bg-[var(--color-retro-charcoal)] text-[var(--color-surface-canvas)] hover:bg-[var(--color-hot-magenta)] shadow-lg";
  } else if (variant === "outline") {
    variantStyle = "border border-[var(--color-retro-border)]/20 text-[var(--color-retro-charcoal)] hover:bg-black/5";
  } else if (variant === "dark") {
    variantStyle = "bg-black text-white hover:bg-gray-800";
  } else if (variant === "text") {
    variantStyle = "px-4 py-2 hover:opacity-50 text-[var(--color-retro-charcoal)]";
  }
  
  return (
    <button type={type} className={`${baseStyle} ${variantStyle}`} onClick={onClick}>
      {children}{icon}
    </button>
  );
}

export function PageTop({ eyebrow, title, intro, action }: { eyebrow: string; title: React.ReactNode; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 mb-16 pt-12 md:pt-24">
      <div className="flex flex-col text-left">
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1 className="font-['Syne'] text-5xl md:text-6xl font-bold tracking-tight mb-6">
          {/* Note: the title prop contains JSX like <>Tell us what<br/><em>went missing.</em></> 
              We'll let it render as is, but rely on global CSS to style <em> to UI Lab italic */}
          {title}
        </h1>
        {intro && <p className="font-['Space_Mono'] text-sm tracking-widest uppercase opacity-60 max-w-lg leading-relaxed">{intro}</p>}
      </div>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}
