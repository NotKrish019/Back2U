'use client';

import { useState, useEffect, useRef } from "react";

export const CursorFollower = () => {
  const mousePosition = useRef({ x: 0, y: 0 });

  const dotPosition = useRef({ x: 0, y: 0 });
  const borderDotPosition = useRef({ x: 0, y: 0 });

  const [renderPos, setRenderPos] = useState({ dot: { x: 0, y: 0 }, border: { x: 0, y: 0 } });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const DOT_SMOOTHNESS = 0.2;
  const BORDER_SMOOTHNESS = 0.1;

  useEffect(() => {
    // Only show on desktop devices where fine pointer is available
    if (window.matchMedia("(pointer: coarse)").matches) return;
    
    setIsVisible(true);

    const handleMouseMove = (e: MouseEvent) => {
      mousePosition.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseEnter = () => setIsHovering(true);
    const handleMouseLeave = () => setIsHovering(false);

    window.addEventListener("mousemove", handleMouseMove);

    // Dynamic observer to attach hover effects to interactive elements
    const attachListeners = () => {
      const interactiveElements = document.querySelectorAll("a, button, input, textarea, select, [role='button'], [tabindex='0']");
      interactiveElements.forEach((element) => {
        // Prevent duplicate listeners
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
        
        element.addEventListener("mouseenter", handleMouseEnter);
        element.addEventListener("mouseleave", handleMouseLeave);
      });
    };

    attachListeners();
    
    // MutationObserver to attach listeners to dynamically added elements
    const observer = new MutationObserver((mutations) => {
      let shouldReattach = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldReattach = true;
          break;
        }
      }
      if (shouldReattach) attachListeners();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Animation function for smooth movement
    const animate = () => {
      const lerp = (start: number, end: number, factor: number) => {
        return start + (end - start) * factor;
      };

      dotPosition.current.x = lerp(dotPosition.current.x, mousePosition.current.x, DOT_SMOOTHNESS);
      dotPosition.current.y = lerp(dotPosition.current.y, mousePosition.current.y, DOT_SMOOTHNESS);

      borderDotPosition.current.x = lerp(borderDotPosition.current.x, mousePosition.current.x, BORDER_SMOOTHNESS);
      borderDotPosition.current.y = lerp(borderDotPosition.current.y, mousePosition.current.y, BORDER_SMOOTHNESS);

      setRenderPos({
        dot: { x: dotPosition.current.x, y: dotPosition.current.y },
        border: { x: borderDotPosition.current.x, y: borderDotPosition.current.y },
      });

      requestAnimationFrame(animate);
    };

    const animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      observer.disconnect();
      const interactiveElements = document.querySelectorAll("a, button, input, textarea, select, [role='button'], [tabindex='0']");
      interactiveElements.forEach((element) => {
        element.removeEventListener("mouseenter", handleMouseEnter);
        element.removeEventListener("mouseleave", handleMouseLeave);
      });
      cancelAnimationFrame(animationId);
    };
  }, []);

  if (typeof window === "undefined" || !isVisible) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <div
        className="absolute rounded-full bg-[var(--color-hot-pink)]"
        style={{
          width: "6px",
          height: "6px",
          transform: "translate(-50%, -50%)",
          left: `${renderPos.dot.x}px`,
          top: `${renderPos.dot.y}px`,
          willChange: "left, top",
        }}
      />
      <div
        className="absolute rounded-full border border-[var(--color-hot-pink)]"
        style={{
          width: isHovering ? "36px" : "24px",
          height: isHovering ? "36px" : "24px",
          transform: "translate(-50%, -50%)",
          left: `${renderPos.border.x}px`,
          top: `${renderPos.border.y}px`,
          transition: "width 0.2s ease-out, height 0.2s ease-out",
          willChange: "left, top, width, height",
        }}
      />
    </div>
  );
};
