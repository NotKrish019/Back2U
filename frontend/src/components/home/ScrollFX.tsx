"use client";

import { useEffect } from "react";

/**
 * Scroll-scrubbed motion for the calmer home sections after the story.
 * Every effect is tied to scroll position (scrub), not to a one-off viewport trigger.
 */
export default function ScrollFX() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let revert: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const ctx = gsap.context(() => {
        // research index slides in row by row
        gsap.utils.toArray<HTMLElement>(".b2-paper").forEach((el) => {
          gsap.fromTo(el, { x: 70, opacity: 0.2 }, { x: 0, opacity: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 98%", end: "top 70%", scrub: 0.6 } });
        });
      });
      revert = () => ctx.revert();
      ScrollTrigger.refresh();
    })();
    return () => { cancelled = true; revert?.(); };
  }, []);
  return null;
}
