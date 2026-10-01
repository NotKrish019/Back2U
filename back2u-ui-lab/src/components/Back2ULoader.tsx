/* eslint-disable */
"use client";

import React, { useEffect, useRef, useState } from "react";

const CONFIG = {
  durationMs: 3000,
  fadeMs: 600,
  cellSize: 13,
  tint: "#3ca6ff",
  tintOpacity: 0.32,
  lensFocus: 40,
  animSpeed: 0.002, // modulated
  waveFrequency: 0.05,
  bloomIntensity: 0.6,
  vignetteIntensity: 0.38,
  scanLineIntensity: 0.6,
};

export function Back2ULoader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stage, setStage] = useState<"loading" | "animating" | "zooming" | "fading" | "done">("loading");
  
  // Using a ref for state to avoid re-renders during the animation loop
  const stateRef = useRef({
    startTime: 0,
    imageLoaded: false,
    hasError: false,
    reducedMotion: false,
  });

  useEffect(() => {
    // Check for reduced motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    stateRef.current.reducedMotion = mediaQuery.matches;

    // Load image
    const img = new Image();
    img.src = "/mocks/magnifying_glass.jpg";
    img.crossOrigin = "anonymous";
    img.onload = () => {
      stateRef.current.imageLoaded = true;
      startAnimation(img);
    };
    img.onerror = () => {
      stateRef.current.hasError = true;
      startFallback();
    };

    // Overall timer
    let doneTimer: NodeJS.Timeout;
    let zoomTimer: NodeJS.Timeout;
    const totalTime = CONFIG.durationMs;
    
    zoomTimer = setTimeout(() => {
      setStage("zooming");
    }, 2350);

    doneTimer = setTimeout(() => {
      setStage("done");
    }, totalTime);

    return () => {
      if (zoomTimer) clearTimeout(zoomTimer);
      if (doneTimer) clearTimeout(doneTimer);
      cancelAnimationFrame(reqRef.current);
    };
  }, []);

  const reqRef = useRef<number>(0);

  const startFallback = () => {
    setStage("animating");
    // We could render a simple fallback to canvas, but a CSS fallback is also fine if image fails.
  };

  const startAnimation = (img: HTMLImageElement) => {
    setStage("animating");
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Create an offscreen canvas to sample the image
    const offCanvas = document.createElement("canvas");
    const offCtx = offCanvas.getContext("2d");
    if (!offCtx) return;

    // We want the image to fit/cover the center of the screen
    // Let's draw it scaled to fit a certain area, e.g., 400x400
    const imgAspect = img.width / img.height;
    
    // Determine the size of the rasterized area
    const isMobile = width < 768;
    const targetWidth = isMobile ? Math.min(width * 0.8, 340) : Math.min(width * 0.6, 500);
    const targetHeight = targetWidth / imgAspect;

    offCanvas.width = targetWidth;
    offCanvas.height = targetHeight;
    offCtx.drawImage(img, 0, 0, targetWidth, targetHeight);
    
    const imgData = offCtx.getImageData(0, 0, targetWidth, targetHeight).data;
    
    const cols = Math.floor(targetWidth / CONFIG.cellSize);
    const rows = Math.floor(targetHeight / CONFIG.cellSize);
    
    // Pre-calculate cell data (luminance, color)
    const cells: { x: number, y: number, r: number, g: number, b: number, lum: number, cx: number, cy: number }[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx = c * CONFIG.cellSize + CONFIG.cellSize / 2;
        const cy = r * CONFIG.cellSize + CONFIG.cellSize / 2;
        
        let sumR = 0, sumG = 0, sumB = 0, count = 0;
        
        // Sample a smaller block inside the cell to speed up
        for (let py = Math.max(0, cy - 2); py < Math.min(targetHeight, cy + 2); py++) {
          for (let px = Math.max(0, cx - 2); px < Math.min(targetWidth, cx + 2); px++) {
            const idx = (Math.floor(py) * Math.floor(targetWidth) + Math.floor(px)) * 4;
            sumR += imgData[idx];
            sumG += imgData[idx + 1];
            sumB += imgData[idx + 2];
            count++;
          }
        }
        
        const avgR = count ? sumR / count : 0;
        const avgG = count ? sumG / count : 0;
        const avgB = count ? sumB / count : 0;
        // Standard relative luminance
        const lum = (0.2126 * avgR + 0.7152 * avgG + 0.0722 * avgB) / 255;
        
        cells.push({
          x: c, y: r,
          r: avgR, g: avgG, b: avgB,
          lum,
          cx, cy
        });
      }
    }

    stateRef.current.startTime = performance.now();
    
    const draw = (time: number) => {
      const elapsed = time - stateRef.current.startTime;

      // Clear
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;

      // ---- MOTION LOGIC ----
      const isZooming = elapsed > 2350;
      
      let zoomProgress = 0;
      let zoomScale = 1;
      let motionElapsed = elapsed;
      
      if (isZooming) {
        zoomProgress = Math.min(1, (elapsed - 2350) / 650);
        // Freeze physical searching movement during final zoom
        motionElapsed = 2350;
        
        // Accelerated easing curve for the zoom (easeInQuart)
        const ease = zoomProgress * zoomProgress * zoomProgress * zoomProgress;
        zoomScale = 1 + ease * 120; // Massive scale to ensure lens pixels cover the screen
        
        if (stateRef.current.reducedMotion) {
           zoomScale = 1 + (zoomProgress * zoomProgress) * 2; // Very gentle scale for reduced motion
        }
      }

      // 0.5 orbits per second => 1 orbit per 2000ms
      const cycle = motionElapsed / 2000; 
      
      // Organic easing: 3 inspection slowdowns per orbit
      const timeWarp = cycle - Math.sin(cycle * Math.PI * 2 * 3) * 0.04; 
      
      let settleFactor = 1.0;
      if (motionElapsed > 2100) {
        settleFactor = Math.max(0, 1 - (motionElapsed - 2100) / 250);
      }

      // Responsive large search orbit covering the viewport
      const radiusX = isMobile ? width * 0.22 : width * 0.26;
      const radiusY = isMobile ? height * 0.15 : height * 0.19;

      // Elliptical search path
      const searchX = Math.cos(timeWarp * Math.PI * 2) * radiusX * settleFactor;
      const searchY = Math.sin(timeWarp * Math.PI * 2) * radiusY * settleFactor; 
      
      // Base rotation: -12 degrees resting tilt. + tightly controlled 3 deg wobble
      const baseRot = -12 * (Math.PI / 180);
      const searchRot = baseRot + Math.sin(timeWarp * Math.PI * 2) * (3 * Math.PI / 180) * settleFactor;
      
      // Secondary organic drift
      const driftX = Math.sin(motionElapsed * 0.003) * 4;
      const driftY = Math.cos(motionElapsed * 0.002) * 4;
      
      // Calculate active focus (pulsing exactly during the 3 slowdowns)
      const inspectPhase = Math.sin(cycle * Math.PI * 2 * 3); 
      const isInspecting = Math.max(0, inspectPhase); // 0 to 1
      let dynamicFocus = 1.0 + (isInspecting * 0.35); // 1.0 to 1.35
      
      let exitGlow = 0;
      if (isZooming) {
        dynamicFocus = 1.3 + zoomProgress * 1.5; // ramps up focus deeply during zoom
        exitGlow = Math.sin(Math.min(1, zoomProgress * 2) * Math.PI) * 0.5; // subtle glow pulse early in zoom
      }
      
      let finalX = searchX + driftX;
      let finalY = searchY + driftY;
      let finalRot = searchRot;
      
      if (stateRef.current.reducedMotion) {
        finalX = 0;
        finalY = 0;
        finalRot = baseRot;
        dynamicFocus = 1.0;
        exitGlow = 0;
      }
      // ---- END MOTION LOGIC ----

      const lensGlobalX = centerX + finalX;
      const lensGlobalY = centerY + finalY;

      // Apply Global Zoom Transform
      ctx.save();
      if (zoomScale > 1) {
        ctx.translate(lensGlobalX, lensGlobalY);
        ctx.scale(zoomScale, zoomScale);
        ctx.translate(-lensGlobalX, -lensGlobalY);
      }

      // Draw blurred background
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.filter = "blur(20px)";
      ctx.translate(lensGlobalX, lensGlobalY);
      ctx.rotate(finalRot);
      ctx.drawImage(img, -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
      ctx.restore();

      // Render cells
      // We will render the background grid FIRST, independent of the magnifying glass transform
      ctx.save();
      ctx.fillStyle = "rgba(60, 166, 255, 0.15)";
      for (const cell of cells) {
        if (cell.lum < 0.05) {
           // Background technical grid (small dots)
           ctx.fillRect(centerX - targetWidth / 2 + cell.cx - 1, centerY - targetHeight / 2 + cell.cy - 1, 2, 2);
        }
      }
      ctx.restore();

      ctx.save();
      ctx.translate(centerX + finalX, centerY + finalY);
      ctx.rotate(finalRot);
      // Translate back so the top-left of the image is at -targetWidth/2, -targetHeight/2
      ctx.translate(-targetWidth / 2, -targetHeight / 2);

      const centerCellX = targetWidth / 2;
      const centerCellY = targetHeight / 2;

      for (const cell of cells) {
        if (cell.lum < 0.05) continue; // Foreground cells only
        
        const dx = cell.cx - centerCellX;
        // Adjust for tiltPosition (50 means center)
        const tiltCenterY = targetHeight * (50 / 100);
        const dy = cell.cy - tiltCenterY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Animation modulation (existing wave effect)
        const phase = elapsed * CONFIG.animSpeed - dist * CONFIG.waveFrequency;
        const modulation = Math.sin(phase) * 0.5 + 0.5; // 0 to 1
        
        // Lens focus: stronger detail and contrast inside the focus area
        const focusRadius = (targetWidth / 2) * (35 / 50); 
        const lensFactor = Math.max(0, 1 - (dist / focusRadius));
        
        // Enhance contrast inside the lens, reduce outside
        let contrastAdjust = 1.0;
        if (lensFactor > 0.1) {
          // Multiply by dynamicFocus to pulse during pauses
          contrastAdjust = 1.0 + (lensFactor * 0.5 * dynamicFocus);
        } else {
          contrastAdjust = 0.6; // Softer density outside
        }
        
        // Apply contrast to luminance around mid-gray (0.5)
        let enhancedLum = (cell.lum - 0.5) * contrastAdjust + 0.5;
        // Boost brightness inside lens
        enhancedLum = Math.max(0, Math.min(1, enhancedLum + (lensFactor * 0.2 * (CONFIG.lensFocus / 40) * dynamicFocus)));

        // Final cell size
        let baseSize = enhancedLum * CONFIG.cellSize * (lensFactor > 0 ? 0.9 : 0.6);
        let size = baseSize + (modulation * 2) + (exitGlow * 2 * lensFactor);
        
        if (stateRef.current.reducedMotion) {
          size = baseSize + 1;
        }
        
        // Preserve source colors for the magnifying glass.
        // We only add a tiny amount of the #3ca6ff tint as a cool technical accent to the lens rim/glass.
        const tR = 60, tG = 166, tB = 255;
        // Apply much less tint (e.g. 5-10%) so gold is preserved
        const actualTintOpacity = CONFIG.tintOpacity * 0.3; 
        const blendR = cell.r * (1 - actualTintOpacity) + tR * actualTintOpacity;
        const blendG = cell.g * (1 - actualTintOpacity) + tG * actualTintOpacity;
        const blendB = cell.b * (1 - actualTintOpacity) + tB * actualTintOpacity;
        
        const brightnessMult = 1 + (modulation * 0.3) + (lensFactor * 0.5 * dynamicFocus) + exitGlow;
        
        ctx.fillStyle = `rgb(${Math.min(255, blendR * brightnessMult)}, ${Math.min(255, blendG * brightnessMult)}, ${Math.min(255, blendB * brightnessMult)})`;
        
        // Render Pixel (square)
        const drawSize = Math.max(0.1, size);
        ctx.fillRect(cell.cx - drawSize/2, cell.cy - drawSize/2, drawSize, drawSize);
      }
      ctx.restore();

      // Post-Processing
      // 1. Scanlines
      if (CONFIG.scanLineIntensity > 0) {
        ctx.save();
        ctx.fillStyle = `rgba(0, 0, 0, ${CONFIG.scanLineIntensity * 0.15})`;
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1);
        }
        ctx.restore();
      }

      // 2. Vignette
      if (CONFIG.vignetteIntensity > 0) {
        ctx.save();
        const grad = ctx.createRadialGradient(centerX, centerY, targetWidth * 0.4, centerX, centerY, Math.max(width, height) * 0.8);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${CONFIG.vignetteIntensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 3. Bloom (simplified, just add a subtle white/blue glow in the center)
      if (CONFIG.bloomIntensity > 0) {
        ctx.save();
        ctx.globalCompositeOperation = "screen";
        const bloomGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, targetWidth * 0.6);
        bloomGrad.addColorStop(0, `rgba(60, 166, 255, ${CONFIG.bloomIntensity * 0.15})`);
        bloomGrad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = bloomGrad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // 4. Microscopic Handoff Fade
      if (isZooming && canvasRef.current) {
        let opacity = 1.0;
        
        if (stateRef.current.reducedMotion) {
           // Smoother, more obvious crossfade for reduced motion (last 30%)
           if (zoomProgress > 0.7) {
              opacity = Math.max(0, 1.0 - ((zoomProgress - 0.7) * (1 / 0.3)));
           }
        } else {
           // Microscopic 5% handoff for normal motion
           if (zoomProgress > 0.95) {
              opacity = Math.max(0, 1.0 - ((zoomProgress - 0.95) * 20)); // Fades 1 to 0 in last 5%
           }
        }
        canvasRef.current.style.opacity = opacity.toString();
      }

      reqRef.current = requestAnimationFrame(draw);
    };

    reqRef.current = requestAnimationFrame(draw);
  };

  if (stage === "done") return null;

  const isFading = stage === "fading";

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: stage === "zooming" ? "transparent" : "#000000",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        opacity: 1,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />
      
      {/* Branding overlay */}
      <div style={{
        position: "absolute",
        bottom: "8%",
        textAlign: "center",
        color: "rgba(255,255,255,0.7)",
        fontFamily: "'DM Mono', monospace",
        fontSize: "12px",
        letterSpacing: "0.1em",
        zIndex: 2,
        opacity: stage === "loading" || stage === "zooming" ? 0 : 1,
        transition: "opacity 0.4s ease"
      }}>
        <div style={{ fontWeight: 600, color: "#fff", marginBottom: "4px" }}>BACK2U</div>
        <div style={{ fontSize: "10px", opacity: 0.6 }}>MULTIMODAL LOST PROPERTY RE-IDENTIFICATION</div>
      </div>

      {(stage === "loading" || stateRef.current.hasError) && (
        <div style={{ color: "white", zIndex: 10 }}>
           {/* Fallback visual if canvas/image fails or is still loading */}
           <div style={{
             width: "40px",
             height: "40px",
             border: "2px solid rgba(60, 166, 255, 0.2)",
             borderTopColor: "#3ca6ff",
             borderRadius: "50%",
             animation: "spin 1s linear infinite"
           }} />
           <style>{`
             @keyframes spin { 100% { transform: rotate(360deg); } }
           `}</style>
        </div>
      )}
    </div>
  );
}
