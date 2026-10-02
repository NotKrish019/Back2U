'use client';
import { useEffect, useRef } from 'react';

export default function GlobalMeshBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let w = 0;
    let h = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
    };
    window.addEventListener('resize', resize);
    resize();

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Softened Pastel Pink/Lavender/White palette matching BACK2U
    const blobs = [
      { color: '255, 255, 255',   x: 0.67, y: 0.45, size: 0.8, pX: 1.2, pY: 3.4 },
      { color: '248, 135, 172',   x: 0.35, y: 0.65, size: 0.6, pX: 4.1, pY: 1.8 }, // Soft Pastel Pink
      { color: '185, 155, 235',   x: 0.48, y: 0.20, size: 0.7, pX: 2.5, pY: 5.2 }, // Soft Pastel Lavender
      { color: '248, 135, 172',   x: 0.80, y: 0.88, size: 0.6, pX: 0.9, pY: 2.1 }, // Soft Pastel Pink
      { color: '185, 155, 235',   x: 0.15, y: 0.15, size: 0.7, pX: 5.5, pY: 0.4 }, // Soft Pastel Lavender
      { color: '255, 255, 255',   x: 0.50, y: 0.50, size: 0.9, pX: 3.2, pY: 4.4 }, // large central white glow
    ];

    let startT = performance.now();
    let animationFrameId: number;

    const draw = (time: number) => {
      if (prefersReducedMotion) {
        time = startT; 
      }
      
      const t = (time - startT) / 1000;
      const ph = t * 0.45; // Increased speed from 0.15 for more observable movement
      
      // Base background color
      ctx.fillStyle = '#F4EEF4'; // Slightly darker neutral to make colors pop
      ctx.fillRect(0, 0, w, h);

      for (const blob of blobs) {
        // EXACT zero at t=0: (sin(ph + p) - sin(p))
        const modX = (Math.sin(ph * 0.55 + blob.pX) - Math.sin(blob.pX)) * 0.25; // Increased movement range
        const modY = (Math.sin(ph * 0.43 + blob.pY) - Math.sin(blob.pY)) * 0.25;
        
        const cx = (blob.x + modX) * w;
        const cy = (blob.y + modY) * h;
        const radius = blob.size * Math.max(w, h);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        // Softer opacity stops for reduced contrast
        grad.addColorStop(0, `rgba(${blob.color}, 0.8)`);
        grad.addColorStop(0.5, `rgba(${blob.color}, 0.45)`);
        grad.addColorStop(1, `rgba(${blob.color}, 0)`);

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }

      // Very subtle static grain overlay (optional, keeping it lightweight)
      // Since continuous grain generation is expensive, we rely on CSS or skip it to maintain 60fps.

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full -z-10 pointer-events-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />
      {/* CSS subtle grain overlay */}
      <div 
        className="absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%2E")' }}
      />
    </div>
  );
}
