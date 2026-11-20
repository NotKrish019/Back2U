"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { B2Button, Eyebrow, Reveal, Viewfinder } from "@/components/brand/primitives";

const EASE = [0.16, 1, 0.3, 1] as const;

/* ------------------------------------------------------------------ 03 · How a search works */
const STEPS = [
  { k: "Input", t: "You bring what you remember", d: "A photo, a description in your own words, or both — plus where and when.", img: "/mocks/workflow_step1.jpg" },
  { k: "Detect & crop", t: "The item is isolated", d: "Grounding DINO finds the object and crops it, so the table, the bag or the background doesn't drive the match.", img: "/mocks/workflow_step2.jpg" },
  { k: "Category gate", t: "Unknown objects are refused", d: "A trained head predicts the category and rejects photos that aren't a supported item, instead of guessing.", img: "/mocks/workflow_step3.jpg" },
  { k: "Instance embedding", t: "This bottle, not just a bottle", d: "DINOv2 with a projection head trained by supervised contrastive learning, so two similar laptops still land far apart.", img: "/mocks/workflow_step4.jpg" },
  { k: "Vector search", t: "Found reports are compared", d: "FAISS nearest-neighbour search runs over every found item; SigLIP2 scores your words against each photo.", img: "/mocks/workflow_step5.jpg" },
  { k: "Rerank & calibrate", t: "Evidence becomes a score", d: "A trained reranker fuses the visual and text evidence into a calibrated match probability.", img: "/mocks/workflow_step6.jpg" },
  { k: "Verify", t: "A person confirms ownership", d: "You claim the item; campus staff review the evidence before anything is handed back.", img: "/mocks/workflow_step7.jpg" },
];

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const reduce = useReducedMotion();
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-step]") ?? []);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.step));
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    items.forEach((i) => io.observe(i));
    return () => io.disconnect();
  }, []);

  return (
    <section className="b2-how" aria-labelledby="how-title">
      <div className="b2-container">
        <div className="b2-sechead">
          <Reveal><Eyebrow>03 — What happens when you search</Eyebrow></Reveal>
          <Reveal delay={80}>
            <h2 id="how-title" className="b2-display b2-d1 max-w-[18ch]">
              Less searching. <em>More finding.</em>
            </h2>
          </Reveal>
        </div>

        <div className="b2-how__grid">
          <div className="b2-how__sticky">
            <div className="b2-how__plate">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.img
                  key={STEPS[active].img}
                  src={STEPS[active].img}
                  alt=""
                  loading="lazy"
                  initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 1.04 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: EASE }}
                />
              </AnimatePresence>
              <Viewfinder size={22} inset={14} color="#fbf9f4" />
              <div className="b2-how__counter b2-num" aria-hidden="true">
                <span>{String(active + 1).padStart(2, "0")}</span>
                <span className="opacity-50"> / {String(STEPS.length).padStart(2, "0")}</span>
              </div>
            </div>
          </div>

          <ol ref={listRef} className="b2-how__list">
            {STEPS.map((s, i) => (
              <li key={s.k} data-step={i} className="b2-how__step" data-active={i === active}>
                <span className="b2-num b2-how__n">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <span className="b2-label b2-label--brass">{s.k}</span>
                  <h3 className="b2-display b2-d3 mt-3">{s.t}</h3>
                  <p className="b2-body mt-3 max-w-[44ch]">{s.d}</p>
                  {/* mobile: show the image inline */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt="" loading="lazy" className="b2-how__inline" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ 06 · Close */
export function Closing() {
  return (
    <section className="b2-close" aria-labelledby="close-title">
      <div className="b2-container b2-close__inner">
        <Reveal>
          <h2 id="close-title" className="b2-display b2-d1 max-w-[14ch]">
            Start with whatever <em>you remember.</em>
          </h2>
        </Reveal>
        <Reveal delay={120} className="flex flex-wrap gap-3">
          <B2Button href="/search" size="lg" icon={<ArrowRight size={18} />}>Search by photo</B2Button>
          <B2Button href="/browse" size="lg" variant="ghost" icon={<ArrowUpRight size={18} />}>Browse found items</B2Button>
        </Reveal>
      </div>
    </section>
  );
}
