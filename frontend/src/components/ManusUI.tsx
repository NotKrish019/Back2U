'use client';
import { ArrowUpRight } from 'lucide-react';
import React from 'react';

export function SectionLabel({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return <div className={`section-label ${light ? "section-label-light" : ""}`}><span className="section-dot" />{children}</div>;
}

export function ActionLink({ children, onClick, light = false }: { children: React.ReactNode; onClick?: () => void; light?: boolean }) {
  return <button className={`action-link ${light ? "action-link-light" : ""}`} onClick={onClick}>{children}<ArrowUpRight size={17} strokeWidth={1.6} /></button>;
}

export function Button({ children, onClick, variant = "solid", icon, type = "button" }: { children: React.ReactNode; onClick?: () => void; variant?: "solid" | "outline" | "dark" | "text"; icon?: React.ReactNode; type?: "button" | "submit" }) {
  return <button type={type} className={`button button-${variant}`} onClick={onClick}>{children}{icon}</button>;
}

export function PageTop({ eyebrow, title, intro, action }: { eyebrow: string; title: React.ReactNode; intro?: string; action?: React.ReactNode }) {
  return (
    <div className="page-top container-wide">
      <div>
        <SectionLabel>{eyebrow}</SectionLabel>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
      {action && <div className="page-top-action">{action}</div>}
    </div>
  );
}
