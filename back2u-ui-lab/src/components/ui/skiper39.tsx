/* eslint-disable */
"use client";

import { gsap } from "gsap";
import React, { useEffect, useRef } from "react";

interface CrowdCanvasProps {
  dir?: string;
  count?: number;
}

const CrowdCanvas = ({ dir = "/assets/peeps/", count = 95 }: CrowdCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // UTILS
    const randomRange = (min: number, max: number) =>
      min + Math.random() * (max - min);
    const randomIndex = (array: any[]) => randomRange(0, array.length) | 0;
    const removeFromArray = (array: any[], i: number) => array.splice(i, 1)[0];
    const removeItemFromArray = (array: any[], item: any) =>
      removeFromArray(array, array.indexOf(item));
    const removeRandomFromArray = (array: any[]) =>
      removeFromArray(array, randomIndex(array));
    const getRandomFromArray = (array: any[]) => array[randomIndex(array) | 0];

    // TWEEN FACTORIES
    const resetPeep = ({ stage, peep }: { stage: any; peep: any }) => {
      const direction = Math.random() > 0.5 ? 1 : -1;
      
      // Assign row (0 = Front, 1 = Middle, 2 = Back)
      let row = Math.random() < 0.33 ? 0 : Math.random() < 0.5 ? 1 : 2;
      
      // If character is partial (cut off), force it to Front or Middle 
      if (peep.height < 250) {
        row = Math.random() < 0.7 ? 0 : 1;
      }
      
      let scale = 1;
      let offsetY = randomRange(5, 12); // Pushed DOWN slightly so the flat bottom is always hidden
      
      if (row === 0) {
        scale = randomRange(0.95, 1.10);
        peep.anchorY = 100; // Force Front Row to render last (on top)
      } else if (row === 1) {
        scale = randomRange(0.75, 0.90);
        peep.anchorY = 50;  // Force Middle Row to render between
      } else {
        scale = randomRange(0.55, 0.70);
        peep.anchorY = 0;   // Force Back Row to render first (behind)
      }
      
      peep.scale = scale;

      // Base Y Calculation - Align BOTTOM of scaled character precisely with bottom of screen
      const startY = stage.height - (peep.height * scale) + offsetY;
      
      let startX: number;
      let endX: number;

      // We need to account for scaled width when calculating start/end X
      const scaledWidth = peep.width * scale;

      if (direction === 1) {
        startX = -scaledWidth;
        endX = stage.width;
        peep.scaleX = 1;
      } else {
        startX = stage.width + scaledWidth;
        endX = 0;
        peep.scaleX = -1;
      }

      peep.x = startX;
      peep.y = startY;
      // Note: anchorY is already set by row assignment for perfect depth sorting

      return {
        startX,
        startY,
        endX,
      };
    };

    const normalWalk = ({ peep, props }: { peep: any; props: any }) => {
      const { startX, startY, endX } = props;
      const xDuration = 10;
      const yDuration = 0.3; 

      const tl = gsap.timeline();
      tl.timeScale(randomRange(0.8, 1.2));
      tl.to(
        peep,
        {
          duration: xDuration,
          x: endX,
          ease: "none",
        },
        0,
      );
      tl.to(
        peep,
        {
          duration: yDuration,
          repeat: xDuration / yDuration,
          yoyo: true,
          y: startY - 2, // Tiny 2px bounce so they never float above the screen edge
        },
        0,
      );

      return tl;
    };

    const walks = [normalWalk];

    type Peep = {
      image: HTMLImageElement;
      rect: number[];
      width: number;
      height: number;
      drawArgs: any[];
      x: number;
      y: number;
      anchorY: number;
      scaleX: number;
      scale: number;
      walk: any;
      setRect: (rect: number[]) => void;
      render: (ctx: CanvasRenderingContext2D) => void;
    };

    const createPeep = ({
      image,
      rect,
    }: {
      image: HTMLImageElement;
      rect: number[];
    }): Peep => {
      const peep: Peep = {
        image,
        rect: [],
        width: 0,
        height: 0,
        drawArgs: [],
        x: 0,
        y: 0,
        anchorY: 0,
        scaleX: 1,
        scale: 1,
        walk: null,
        setRect: (rect: number[]) => {
          peep.rect = rect;
          peep.width = rect[2];
          peep.height = rect[3];
          peep.drawArgs = [peep.image, ...rect, 0, 0, peep.width, peep.height];
        },
        render: (ctx: CanvasRenderingContext2D) => {
          ctx.save();
          ctx.translate(peep.x, peep.y);
          ctx.scale(peep.scaleX * peep.scale, peep.scale);
          ctx.drawImage(
            peep.image,
            peep.rect[0],
            peep.rect[1],
            peep.rect[2],
            peep.rect[3],
            0,
            0,
            peep.width,
            peep.height,
          );
          ctx.restore();
        },
      };

      peep.setRect(rect);
      return peep;
    };

    const stage = {
      width: 0,
      height: 0,
    };
    
    // Increased to 1.1 to ensure characters occupy ~25% of the hero section
    const globalScale = 1.1;

    const allPeeps: Peep[] = [];
    const availablePeeps: Peep[] = [];
    const crowd: Peep[] = [];

    const createPeeps = (loadedImages: HTMLImageElement[]) => {
      loadedImages.forEach((img) => {
        // Create 1 or 2 instances (avg ~1.75) to reduce density by ~10-15% from previous 2x
        const instances = Math.random() < 0.75 ? 2 : 1;
        for (let i = 0; i < instances; i++) {
          allPeeps.push(
            createPeep({
              image: img,
              rect: [0, 0, img.naturalWidth, img.naturalHeight],
            })
          );
        }
      });
    };

    const initCrowd = () => {
      while (availablePeeps.length) {
        addPeepToCrowd().walk.progress(Math.random());
      }
    };

    const addPeepToCrowd = () => {
      const peep = removeRandomFromArray(availablePeeps);
      const walk = getRandomFromArray(walks)({
        peep,
        props: resetPeep({
          peep,
          stage,
        }),
      }).eventCallback("onComplete", () => {
        removePeepFromCrowd(peep);
        addPeepToCrowd();
      });

      peep.walk = walk;

      crowd.push(peep);
      crowd.sort((a, b) => a.anchorY - b.anchorY);

      return peep;
    };

    const removePeepFromCrowd = (peep: Peep) => {
      removeItemFromArray(crowd, peep);
      availablePeeps.push(peep);
    };

    const render = () => {
      if (!canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(devicePixelRatio * globalScale, devicePixelRatio * globalScale);

      crowd.forEach((peep) => {
        peep.render(ctx);
      });

      ctx.restore();
    };

    const resize = () => {
      if (!canvas) return;
      stage.width = canvas.clientWidth / globalScale;
      stage.height = canvas.clientHeight / globalScale;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      crowd.forEach((peep) => {
        peep.walk.kill();
      });

      crowd.length = 0;
      availablePeeps.length = 0;
      
      // Fix: We must not push the same object references multiple times.
      // We will push the allPeeps, and if we want more density, we create more instances.
      availablePeeps.push(...allPeeps);

      initCrowd();
    };

    const init = (loadedImages: HTMLImageElement[]) => {
      createPeeps(loadedImages);
      resize();
      gsap.ticker.add(render);
    };

    const loadedImages: HTMLImageElement[] = [];
    let loadCount = 0;

    for (let i = 0; i < count; i++) {
      const img = document.createElement("img");
      img.onload = () => {
        loadCount++;
        if (loadCount === count) {
          init(loadedImages);
        }
      };
      img.src = `${dir}peep_${i}.png`;
      loadedImages.push(img);
    }

    const handleResize = () => resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      gsap.ticker.remove(render);
      crowd.forEach((peep) => {
        if (peep.walk) peep.walk.kill();
      });
    };
  }, []);
  return (
    <canvas ref={canvasRef} className="absolute bottom-0 h-[90vh] w-full" />
  );
};

const Skiper39 = () => {
  return (
    <div className="relative h-full w-full bg-white text-black">
      <div className="absolute top-22 left-1/2 grid -translate-x-1/2 content-start justify-items-center gap-6 text-center text-black">
        <span className="relative max-w-[12ch] text-xs uppercase leading-tight opacity-40 after:absolute after:left-1/2 after:top-full after:h-16 after:w-px after:bg-gradient-to-b after:from-white after:to-black after:content-['']">
          BACK2U / CAMPUS CROWD
        </span>
      </div>
      <div className="absolute bottom-0 h-full w-screen">
        <CrowdCanvas
          src="/assets/crowd-sprite.png"
          rows={15}
          cols={7}
        />
      </div>
    </div>
  );
};

export { CrowdCanvas, Skiper39 };
export default Skiper39;
