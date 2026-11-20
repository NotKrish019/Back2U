"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { B2Button, Eyebrow } from "@/components/brand/primitives";
import type { FocusRect, SceneHandle } from "./objectScene";

const EASE = [0.16, 1, 0.3, 1] as const;

function Line({ children, delay, reduce }: { children: React.ReactNode; delay: number; reduce: boolean | null }) {
  return (
    <span className="block overflow-hidden pb-[0.08em] -mb-[0.08em]">
      <motion.span
        className="block"
        initial={{ y: "105%" }}
        animate={{ y: "0%" }}
        transition={reduce ? { duration: 0 } : { duration: 1.1, delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Static composition used when WebGL is unavailable. Uses the existing object renders. */
function FallbackStill() {
  const tiles = [
    { src: "/icons/phone.jpg", cls: "left-[30%] top-[18%] w-[34%] rotate-[-4deg]" },
    { src: "/icons/keys.jpg", cls: "left-[66%] top-[6%] w-[24%] rotate-[6deg]" },
    { src: "/icons/wallet.jpg", cls: "left-[64%] top-[56%] w-[26%] rotate-[-3deg]" },
    { src: "/icons/headphones.jpg", cls: "left-[4%] top-[8%] w-[24%] rotate-[3deg]" },
    { src: "/icons/bottle.jpg", cls: "left-[6%] top-[58%] w-[22%] rotate-[-6deg]" },
  ];
  return (
    <div className="absolute inset-0" aria-hidden="true">
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={t.src} src={t.src} alt="" className={`absolute aspect-square object-cover rounded-[10px] mix-blend-multiply ${t.cls}`} />
      ))}
    </div>
  );
}

export default function Hero3D() {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string>("");
  const [mode, setMode] = useState<"loading" | "3d" | "fallback">("loading");

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    if (!stage || !canvas) return;
    let handle: SceneHandle | null = null;
    let cancelled = false;
    let lastIndex = -1;
    let visible = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onFocus = (r: FocusRect | null) => {
      const el = bracketRef.current;
      if (!el) return;
      if (!r) { el.style.opacity = "0"; return; }
      // direct style writes: no React render per frame
      el.style.opacity = "1";
      el.style.transform = `translate3d(${r.x}px, ${r.y}px, 0)`;
      el.style.width = `${r.w}px`;
      el.style.height = `${r.h}px`;
      if (r.index !== lastIndex) {
        lastIndex = r.index;
        setLabel(r.label);
      }
    };

    (async () => {
      const mod = await import("./objectScene");
      if (cancelled) return;
      if (!mod.webglAvailable()) { setMode("fallback"); return; }
      try {
        handle = mod.createObjectScene({
          canvas,
          container: stage,
          reducedMotion: reduced,
          compact: window.innerWidth < 768,
          onFocus,
        });
        setMode("3d");
        handle.setActive(visible && !document.hidden);
      } catch {
        setMode("fallback");
      }
    })();

    // Pause rendering when the hero is off-screen or the tab is hidden.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      handle?.setActive(visible && !document.hidden);
    });
    io.observe(stage);
    const onVis = () => handle?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      handle?.dispose();
    };
  }, []);

  return (
    <section className="b2-hero b2-grain" aria-labelledby="hero-title">
      {/* 3D stage */}
      <div ref={stageRef} className="b2-hero__stage" aria-hidden="true">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full transition-opacity duration-[1200ms]"
          style={{ opacity: mode === "3d" ? 1 : 0 }}
        />
        {mode === "fallback" && <FallbackStill />}
        <div ref={bracketRef} className="b2-hero__bracket" style={{ opacity: 0 }}>
          <span className="b2-vf__c b2-vf__c--tl" />
          <span className="b2-vf__c b2-vf__c--tr" />
          <span className="b2-vf__c b2-vf__c--bl" />
          <span className="b2-vf__c b2-vf__c--br" />
          <span className="b2-hero__tag">{label}</span>
        </div>
      </div>

      <div className="b2-container relative z-10 b2-hero__grid">
        <div className="b2-hero__copy">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <Eyebrow>Campus lost &amp; found</Eyebrow>
          </motion.div>

          <h1 id="hero-title" className="b2-display b2-hero-t mt-7">
            <Line delay={0.15} reduce={reduce}>Lost something?</Line>
            <Line delay={0.27} reduce={reduce}>
              <em>Let&rsquo;s get it</em>
            </Line>
            <Line delay={0.39} reduce={reduce}>
              back<span className="b2-hero__two">2</span>u.
            </Line>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.9, delay: 0.7, ease: EASE }}
          >
            <p className="b2-lead mt-8">
              Find what belongs to you — or help return what someone else lost. Upload a photo, describe it in
              your own words, and Back2U compares it with every found report on campus.
            </p>
            <div className="flex flex-wrap gap-3 mt-9">
              <B2Button href="/search" size="lg" icon={<ArrowRight size={18} />}>Search by photo</B2Button>
              <B2Button href="/report/found" size="lg" variant="ghost">I found something</B2Button>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="b2-container relative z-10 b2-hero__foot"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: reduce ? 0 : 1.1 }}
      >
        <div className="b2-hero__modes">
          <span className="b2-label">Photo</span><i />
          <span className="b2-label">Description</span><i />
          <span className="b2-label">Photo + description</span>
        </div>
        <span className="b2-label b2-hero__caption">Illustration — the real pipeline finds and crops the item before comparing it</span>
      </motion.div>
    </section>
  );
}
