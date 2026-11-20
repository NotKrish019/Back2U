"use client";

import { useEffect, useRef, useState } from "react";
import type { CampusFrame, CampusHandle } from "./campusScene";

const PLACE_NAMES = ["Library", "Lecture hall", "Cafeteria", "Courtyard"];
const OBJ_NOTES = [
  ["Headphones", "Left on the second reading table"],
  ["Wallet", "Slipped down beside a café chair"],
  ["Keys", "Still on a desk near the back row"],
  ["Backpack", "Leaning against a courtyard bench"],
  ["Water bottle", "At the end of the first table"],
];
const CAPTIONS = [
  ["01", "Library", "Headphones, left on the second reading table."],
  ["02", "Cafeteria", "A wallet, slipped down beside a chair."],
  ["03", "Lecture hall", "Keys, still on a desk near the back row."],
];

export default function JourneyBack() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const placeRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pinRefs = useRef<(HTMLDivElement | null)[]>([]);
  const handleRef = useRef<CampusHandle | null>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "static">("loading");

  useEffect(() => {
    const section = sectionRef.current, track = trackRef.current, stage = stageRef.current, canvas = canvasRef.current;
    if (!section || !track || !stage || !canvas) return;
    const sec: HTMLElement = section, trk: HTMLDivElement = track;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let handle: CampusHandle | null = null, cancelled = false, visible = false;
    let revert: (() => void) | undefined;

    const onFrame = (f: CampusFrame) => {
      f.places.forEach((p, i) => {
        const el = placeRefs.current[i]; if (!el) return;
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`; el.style.opacity = String(p.on);
      });
      const first = pinRefs.current[0];
      if (first && first.dataset.back !== String(f.back)) {
        first.dataset.back = String(f.back);
        const k = first.querySelector("span"), e = first.querySelector("em");
        if (k) k.textContent = f.back ? "Back with its owner" : "Left behind";
        if (e) e.textContent = f.back ? "Reported lost, handed in, returned" : OBJ_NOTES[0][1];
      }
      f.objs.forEach((p, i) => {
        const el = pinRefs.current[i]; if (!el) return;
        el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        el.dataset.on = String(p.on > 0.5);
      });
    };

    function choreograph() {
      (async () => {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({ defaults: { ease: "none" } });
          tl.to({}, { duration: 1 }, 0);
          // scene 01 — the campus and the headline
          tl.fromTo(".b2-jb__eyebrow", { opacity: 0 }, { opacity: 1, duration: 0.03 }, 0.0);
          // headline lines slide in from the left (no vertical travel, so lines can never pass through each other)
          const wipe = (sel: string, at: number, dur: number, stagger: number) =>
            gsap.utils.toArray<HTMLElement>(sel).forEach((el, i) =>
              tl.fromTo(el, { opacity: 0, x: -36 }, { opacity: 1, x: 0, duration: dur, ease: "power2.out", immediateRender: true }, at + i * stagger));
          wipe(".b2-jb__head .b2-jb__ln > span", 0.01, 0.06, 0.015);
          tl.fromTo(".b2-jb__lead", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.04 }, 0.06);
          tl.to(".b2-jb__head", { opacity: 0, y: -40, duration: 0.04, ease: "power2.in" }, 0.15);
          tl.to(".b2-jb__scrim", { opacity: 0, duration: 0.04 }, 0.15);
          tl.to(".b2-jb__scrim", { opacity: 1, duration: 0.05 }, 0.82);
          // scene 02 — left behind: one caption per place
          [0.17, 0.29, 0.41].forEach((at, i) => {
            tl.fromTo(`.b2-jb-cap--${i}`, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.03, ease: "power2.out" }, at);
            tl.to(`.b2-jb-cap--${i}`, { opacity: 0, y: -20, duration: 0.025 }, at + 0.09);
          });
          // scene 03 — the connection
          tl.fromTo(".b2-jb__connect", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.04, ease: "power2.out" }, 0.53);
          tl.to(".b2-jb__connect", { opacity: 0, duration: 0.03 }, 0.68);
          // scene 04 — the journey back
          wipe(".b2-jb__close .b2-jb__ln > span", 0.84, 0.06, 0.02);
          tl.fromTo(".b2-jb__closesub", { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.9);
          // chapter rail
          tl.fromTo(".b2-jb-rail__fill", { scaleY: 0 }, { scaleY: 1, duration: 1 }, 0);
          [0, 0.15, 0.5, 0.7].forEach((at, i) => tl.fromTo(`.b2-jb-rail__s--${i}`, { "--on": 0 }, { "--on": 1, duration: 0.02 }, at));
          ScrollTrigger.create({ trigger: trk, start: "top top", end: "bottom bottom", scrub: 0.9, animation: tl, invalidateOnRefresh: true });
          tl.eventCallback("onUpdate", () => handleRef.current?.setProgress(tl.progress()));
        }, sec);
        revert = () => ctx.revert();
      })();
    }

    (async () => {
      const mod = await import("./campusScene");
      if (cancelled) return;
      if (!mod.webglOK()) { setMode("static"); sec.dataset.q = "1"; return; }
      handle = mod.createCampusScene({ canvas, container: stage, compact: window.innerWidth < 760, reducedMotion: reduce, onFrame });
      handleRef.current = handle;
      setMode("3d");
      if (reduce) { handle.setProgress(0.6); sec.dataset.q = "1"; } // settled overview with the thread drawn
      else choreograph();
      handle.setActive(visible && !document.hidden);
    })();
    if (reduce) sec.dataset.q = "1";

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; handle?.setActive(visible && !document.hidden); }, { rootMargin: "150px 0px" });
    io.observe(section);
    const onVis = () => handle?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; io.disconnect(); document.removeEventListener("visibilitychange", onVis); revert?.(); handle?.dispose(); handleRef.current = null; };
  }, []);

  return (
    <section ref={sectionRef} className="b2-jb" data-mode={mode} aria-labelledby="jb-title">
      <div ref={trackRef} className="b2-jb__track">
        <div ref={stageRef} className="b2-jb__stage">
          <div className="b2-jb__sky" aria-hidden="true" />
          <canvas ref={canvasRef} className="b2-jb__canvas" aria-hidden="true" style={{ opacity: mode === "3d" ? 1 : 0 }} />

          <div className="b2-jb__scrim" aria-hidden="true" />
          {/* place labels + object pins (positions written per frame; storytelling, not tracking) */}
          <div className="b2-jb__overlay" aria-hidden="true">
            {PLACE_NAMES.map((n, i) => <span key={n} ref={(el) => { placeRefs.current[i] = el; }} className="b2-jb-place b2-num">{n}</span>)}
            {OBJ_NOTES.map(([n, d], i) => (
              <div key={n} ref={(el) => { pinRefs.current[i] = el; }} className="b2-jb-pin" data-on="false">
                <i /><span className="b2-num">Left behind</span><b>{n}</b><em>{d}</em>
              </div>
            ))}
          </div>

          {/* scene 01 */}
          <header className="b2-jb__head">
            <span className="b2-label b2-label--dot b2-jb__eyebrow">04 — The journey back</span>
            <h2 id="jb-title" className="b2-jb__title">
              <span className="b2-jb__ln"><span>Somewhere on campus,</span></span>
              <span className="b2-jb__ln"><span>something is <em>waiting</em></span></span>
              <span className="b2-jb__ln"><span><em>to come back.</em></span></span>
            </h2>
            <p className="b2-jb__lead">From forgotten headphones in the library to keys left behind in a classroom, Back2U helps connect lost belongings with the people looking for them.</p>
          </header>

          {/* scene 02 */}
          {CAPTIONS.map(([n, place, text], i) => (
            <div key={n} className={`b2-jb-cap b2-jb-cap--${i}`} aria-hidden="true">
              <span className="b2-num">Left behind · {n}</span>
              <b>{place}</b>
              <p>{text}</p>
            </div>
          ))}

          {/* scene 03 */}
          <div className="b2-jb__connect" aria-hidden="true">
            <span className="b2-num">The connection</span>
            <p>Someone reports it lost. Someone hands it in. <em>Back2U is the thread between them.</em></p>
          </div>

          {/* scene 04 */}
          <div className="b2-jb__close">
            <p className="b2-jb__closeline b2-display">
              <span className="b2-jb__ln"><span>Every lost object</span></span>
              <span className="b2-jb__ln"><span>has <em>a journey back.</em></span></span>
            </p>
            <p className="b2-jb__closesub">The headphones from the library, back with the person looking for them.</p>
          </div>

          {/* chapter rail */}
          <ol className="b2-jb-rail" aria-hidden="true">
            <span className="b2-jb-rail__line"><span className="b2-jb-rail__fill" /></span>
            {["The campus", "Left behind", "The connection", "The journey back"].map((t, i) => (
              <li key={t} className={`b2-jb-rail__s b2-jb-rail__s--${i} b2-num`}><i />{t}</li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
