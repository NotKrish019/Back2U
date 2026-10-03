"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

interface ScrollStripTransitionProps {
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
  stripsCount?: number;
  scrollDistance?: number;
}

export function ScrollStripTransition({
  outgoing,
  incoming,
  stripsCount = 20,
  scrollDistance = 800,
}: ScrollStripTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const outgoingRef = useRef<HTMLDivElement>(null);
  const incomingRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!containerRef.current || !outgoingRef.current || !incomingRef.current) return;

    // Accessibility: Respect user's motion preferences
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      // Just set them fully visible/invisible if reduced motion
      outgoingRef.current.style.opacity = "0";
      return;
    }

    const stripHeight = 100 / stripsCount;

    const updateMasks = (progress: number) => {
      const incomingMasks = [];
      const incomingPositions = [];
      const incomingSizes = [];

      const outgoingMasks = [];
      const outgoingPositions = [];
      const outgoingSizes = [];

      for (let i = 0; i < stripsCount; i++) {
        // Stagger the start time of each strip to create a shutter effect
        const start = (i / stripsCount) * 0.4;
        const end = start + 0.6;

        let stripProgress = gsap.utils.normalize(start, end, progress);
        stripProgress = gsap.utils.clamp(0, 1, stripProgress);

        // Smooth easing for each strip's growth
        const easedProgress = gsap.parseEase("power2.inOut")(stripProgress);

        const heightPct = easedProgress * stripHeight;
        const remainingHeight = stripHeight - heightPct;

        // INCOMING LAYER (Next Section)
        // Grows downwards from the top of the strip band
        incomingMasks.push(`linear-gradient(black, black)`);
        incomingPositions.push(`0 ${i * stripHeight}%`);
        // Add a tiny overlap to prevent sub-pixel visual seams
        incomingSizes.push(`100% ${heightPct + 0.1}%`);

        // OUTGOING LAYER (Hero)
        // Occupies the remaining space in the band
        outgoingMasks.push(`linear-gradient(black, black)`);
        outgoingPositions.push(`0 ${i * stripHeight + heightPct}%`);
        outgoingSizes.push(`100% ${remainingHeight + 0.1}%`);
      }

      // Apply to incoming
      incomingRef.current!.style.webkitMaskImage = incomingMasks.join(", ");
      incomingRef.current!.style.maskImage = incomingMasks.join(", ");
      incomingRef.current!.style.webkitMaskPosition = incomingPositions.join(", ");
      incomingRef.current!.style.maskPosition = incomingPositions.join(", ");
      incomingRef.current!.style.webkitMaskSize = incomingSizes.join(", ");
      incomingRef.current!.style.maskSize = incomingSizes.join(", ");
      incomingRef.current!.style.webkitMaskRepeat = "no-repeat";
      incomingRef.current!.style.maskRepeat = "no-repeat";

      // Apply to outgoing
      outgoingRef.current!.style.webkitMaskImage = outgoingMasks.join(", ");
      outgoingRef.current!.style.maskImage = outgoingMasks.join(", ");
      outgoingRef.current!.style.webkitMaskPosition = outgoingPositions.join(", ");
      outgoingRef.current!.style.maskPosition = outgoingPositions.join(", ");
      outgoingRef.current!.style.webkitMaskSize = outgoingSizes.join(", ");
      outgoingRef.current!.style.maskSize = outgoingSizes.join(", ");
      outgoingRef.current!.style.webkitMaskRepeat = "no-repeat";
      outgoingRef.current!.style.maskRepeat = "no-repeat";
    };

    // Initialize state
    updateMasks(0);

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: `+=${scrollDistance}`,
        pin: true,
        scrub: true,
      },
    });

    tl.to({}, {
      duration: 1,
      onUpdate: function () {
        updateMasks(this.progress());
      },
    });

  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="w-full relative z-20">
      <div ref={outgoingRef} className="w-full h-[100svh] relative">
        {outgoing}
      </div>
      <div
        ref={incomingRef}
        className="w-full relative z-10"
        style={{ marginTop: "-100svh" }}
      >
        {incoming}
      </div>
    </div>
  );
}
