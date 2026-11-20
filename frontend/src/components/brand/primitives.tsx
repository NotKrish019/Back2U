"use client";

import Link from "next/link";
import React, { useEffect, useRef } from "react";

/** The BACK2U wordmark — the tilted signal "2" is the identity's anchor. */
export function Wordmark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`b2-wordmark ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      BACK<span className="b2-wordmark__2">2</span>U<i className="b2-wordmark__dot" />
    </span>
  );
}

/** Viewfinder corner brackets. Mirrors the pipeline's detect → crop step. */
export function Viewfinder({
  size = 18,
  inset = 0,
  color,
  className = "",
}: { size?: number; inset?: number | string; color?: string; className?: string }) {
  const style = {
    "--vf-size": `${size}px`,
    "--vf-inset": typeof inset === "number" ? `${inset}px` : inset,
    ...(color ? { "--vf-color": color } : {}),
  } as React.CSSProperties;
  return (
    <span aria-hidden="true" className={`absolute inset-0 pointer-events-none ${className}`} style={style}>
      <span className="b2-vf__c b2-vf__c--tl" />
      <span className="b2-vf__c b2-vf__c--tr" />
      <span className="b2-vf__c b2-vf__c--bl" />
      <span className="b2-vf__c b2-vf__c--br" />
    </span>
  );
}

export function Eyebrow({ children, dot = true, className = "" }: { children: React.ReactNode; dot?: boolean; className?: string }) {
  return <span className={`b2-label ${dot ? "b2-label--dot" : ""} ${className}`}>{children}</span>;
}

type BtnProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "solid" | "ghost" | "light";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  magnetic?: boolean; // pulls gently toward the pointer (fine pointers, motion allowed)
};

/** Magnetic pull: the button drifts up to ~6px toward the cursor and springs back on leave. */
function useMagnetic<T extends HTMLElement>(on: boolean) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el) return;
    if (window.matchMedia("(pointer: coarse), (prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / r.width;
      const y = (e.clientY - (r.top + r.height / 2)) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { el.style.transform = `translate3d(${x * 12}px, ${y * 10}px, 0)`; });
    };
    const leave = () => { cancelAnimationFrame(raf); el.style.transform = ""; };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerleave", leave); cancelAnimationFrame(raf); };
  }, [on]);
  return ref;
}

export function B2Button({ children, href, onClick, variant = "solid", size = "md", icon, type = "button", disabled, className = "", magnetic = false, ...rest }: BtnProps) {
  const linkRef = useMagnetic<HTMLAnchorElement>(magnetic && !!href);
  const btnRef = useMagnetic<HTMLButtonElement>(magnetic && !href);
  const cls = `${magnetic ? "b2-btn--magnetic " : ""}b2-btn ${variant !== "solid" ? `b2-btn--${variant}` : ""} ${size !== "md" ? `b2-btn--${size}` : ""} ${className}`;
  if (href) {
    return (
      <Link ref={linkRef} href={href} className={cls} aria-label={rest["aria-label"]}>
        {children}
        {icon}
      </Link>
    );
  }
  return (
    <button ref={btnRef} type={type} className={cls} onClick={onClick} disabled={disabled} aria-label={rest["aria-label"]}>
      {children}
      {icon}
    </button>
  );
}

/** Adds .is-in to every .b2-reveal descendant as it scrolls into view. One observer per container. */
export function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = Array.from(root.querySelectorAll<HTMLElement>(".b2-reveal"));
    if (root.classList.contains("b2-reveal")) targets.push(root);
    if (!("IntersectionObserver" in window)) {
      targets.forEach((t) => t.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return ref;
}

export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: React.ReactNode; delay?: number; className?: string; as?: React.ElementType }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <Tag ref={ref} className={`b2-reveal ${className}`} style={{ "--d": `${delay}ms` } as React.CSSProperties}>
      {children}
    </Tag>
  );
}

/** Resolve an image_reference from the API into a displayable URL. Logic preserved from the original pages. */
export function resolveImage(ref?: string | null): { src: string | null; blurred: boolean } {
  if (!ref) return { src: null, blurred: false };
  const blurred = ref.startsWith("BLURRED_");
  const r = blurred ? ref.slice("BLURRED_".length) : ref;
  if (!r) return { src: null, blurred };
  const src = /^(http|blob:|data:)/.test(r) ? r : `http://127.0.0.1:8000${r.startsWith("/") ? "" : "/"}${r}`;
  return { src, blurred };
}

/** Item names are stored as categories like "water_bottle". */
export const prettyName = (s?: string | null) => (s ? String(s).replace(/_/g, " ") : "Untitled item");

/** Locations are stored as "Library (02/10/2026, 13:00:00)". Split place and time. */
export function splitLocation(loc?: string | null): { place: string; when: string | null } {
  if (!loc) return { place: "Unknown location", when: null };
  const m = loc.match(/^(.*?)\s*\((.*)\)\s*$/);
  if (m) return { place: m[1] || "Unknown location", when: m[2] || null };
  return { place: loc, when: null };
}

/** <img> that degrades to a labelled placeholder when the stored reference can't be loaded. */
export function SafeImg({ src, alt, loading, className, label = "Photo unavailable" }: { src: string; alt: string; loading?: "eager" | "lazy"; className?: string; label?: string }) {
  const [broken, setBroken] = React.useState(false);
  if (broken) return <span className="b2-noimg">{label}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading={loading} className={className} onError={() => setBroken(true)} />;
}

/**
 * Masked, line-by-line heading reveal (GSAP SplitText). Runs in this component's own effect,
 * i.e. only after it has hydrated — never mutates server HTML before React reconciles it.
 */
export function SplitHeading({ children, className = "", as: Tag = "h1", id }: { children: React.ReactNode; className?: string; as?: "h1" | "h2"; id?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let revert: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { SplitText }] = await Promise.all([import("gsap"), import("gsap/SplitText")]);
      if (cancelled) return;
      gsap.registerPlugin(SplitText);
      const ctx = gsap.context(() => {
        const split = SplitText.create(el, { type: "lines", mask: "lines" });
        gsap.set((split as any).masks ?? [], { paddingTop: "0.14em", paddingBottom: "0.16em", marginTop: "-0.14em", marginBottom: "-0.16em" });
        gsap.from(split.lines, { yPercent: 105, duration: 1.1, ease: "expo.out", stagger: 0.09, onComplete: () => split.revert() });
      });
      revert = () => ctx.revert();
    })();
    return () => { cancelled = true; revert?.(); };
  }, []);
  return <Tag ref={ref} id={id} className={className}>{children}</Tag>;
}
