"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { ArrowDown, ArrowRight } from "lucide-react";
import { B2Button } from "@/components/brand/primitives";
import type { FrameInfo, StoryHandle } from "./storyScene";

gsap.registerPlugin(ScrollTrigger, SplitText);

const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// chapter V catalogue (matches ARCHIVE_SLOTS in archive.ts)
const ARCHIVE_META: Record<string, [string, string]> = {
  headphones: ["A-01", "Headphones"], camera: ["A-02", "Camera · tagged"], phone: ["A-03", "Smartphone"], notebook: ["A-04", "Notebook"],
  wallet: ["A-05", "Wallet"], keys: ["A-06", "Keys"], watch: ["A-07", "Watch"], sunglasses: ["A-08", "Sunglasses"],
};

const STAGES = [
  { k: "Image upload", t: "A photo — and whatever you remember.", d: "Upload a picture, describe it in your own words, or both. Where and when help too." },
  { k: "Object understanding", t: "Find the object. Ignore the rest.", d: "Grounding DINO locates the item and crops it; a trained category gate refuses things that aren't supported items." },
  { k: "Multimodal search", t: "Compare it with everything found.", d: "DINOv2 + a contrastively trained head embed the crop; SigLIP2 scores your words against every found photo." },
  { k: "Instance matching", t: "Nearest neighbours, then a second look.", d: "FAISS returns the closest found items; a trained reranker fuses visual and text evidence into a calibrated score." },
  { k: "Potential recovery", t: "A person confirms it’s yours.", d: "You open the candidates, claim the right one, and campus staff verify ownership before handover." },
];

/** Fallback still for devices without WebGL: the existing object renders. */
function FallbackStill() {
  const tiles = [
    { src: "/icons/headphones.jpg", cls: "left-[46%] top-[10%] w-[20%]" },
    { src: "/icons/phone.jpg", cls: "left-[62%] top-[34%] w-[22%]" },
    { src: "/icons/keys.jpg", cls: "left-[80%] top-[8%] w-[16%]" },
    { src: "/icons/wallet.jpg", cls: "left-[78%] top-[60%] w-[18%]" },
    { src: "/icons/bottle.jpg", cls: "left-[50%] top-[58%] w-[16%]" },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {tiles.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={t.src} src={t.src} alt="" className={`absolute aspect-square object-cover rounded-[10px] mix-blend-multiply ${t.cls}`} />
      ))}
    </div>
  );
}

export default function Story() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scanRef = useRef<HTMLDivElement>(null);
  const scanLabelRef = useRef<HTMLSpanElement>(null);
  const cloudLabelRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "fallback">("loading");
  const [loadPct, setLoadPct] = useState(0);
  // chapter I (hero): identification indicator + catalogue index, driven by the scene each frame
  const idRef = useRef<HTMLDivElement>(null);
  const idNRef = useRef<HTMLSpanElement>(null);
  const idNameRef = useRef<HTMLSpanElement>(null);
  const idSubRef = useRef<HTMLSpanElement>(null);
  const indexRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<StoryHandle | null>(null);
  // chapter V (archive): catalogue cards that follow the focused / hovered belonging
  const focusCardRef = useRef<HTMLDivElement>(null);
  const hoverCardRef = useRef<HTMLDivElement>(null);

  // ------------------------------------------------------------ scroll choreography + 3D
  useIsoLayout(() => {
    const section = sectionRef.current, stage = stageRef.current, canvas = canvasRef.current;
    if (!section || !stage || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let handle: StoryHandle | null = null;
    let cancelled = false;
    let visible = true;
    let lastIdx = -1, lastLocked = false;

    const onFrame = (f: FrameInfo) => {
      const fr = focusRef.current;
      if (fr) {
        fr.style.transform = `translate3d(${f.focus.x}px, ${f.focus.y}px, 0)`;
        fr.style.width = `${f.focus.w}px`;
        fr.style.height = `${f.focus.h}px`;
        fr.dataset.on = String(f.focus.visible);
      }
      f.markers.forEach((m, i) => {
        const el = markerRefs.current[i];
        if (el) { el.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`; el.dataset.on = String(f.focus.visible); }
      });
      const sc = scanRef.current;
      if (sc) {
        sc.style.transform = `translate3d(${f.scan.x}px, ${f.scan.y}px, 0)`;
        sc.style.width = `${f.scan.w}px`;
        sc.style.height = `${f.scan.h}px`;
        sc.dataset.on = String(f.scan.visible);
        sc.dataset.locked = String(f.scan.locked);
        if ((f.scan.index !== lastIdx || f.scan.locked !== lastLocked) && scanLabelRef.current) {
          lastIdx = f.scan.index; lastLocked = f.scan.locked;
          scanLabelRef.current.textContent = f.scan.locked ? "Instance match · the one with the tag" : `Candidate ${String(f.scan.index + 1).padStart(2, "0")} · camera`;
        }
      }
      const cl = cloudLabelRef.current;
      if (cl) cl.style.transform = `translate3d(${f.cloud.x}px, ${f.cloud.y}px, 0)`;
      // chapter I: identification indicator follows the object in focus
      const id = idRef.current;
      if (id) {
        id.dataset.on = String(f.hero1.visible);
        if (f.hero1.visible) {
          // keep the card on screen; flip it to the left when the anchor is near the right edge
          const sw = stage.clientWidth, sh = stage.clientHeight;
          const flip = f.hero1.x > sw - 260;
          id.dataset.flip = String(flip);
          const x = Math.min(Math.max(f.hero1.x, 24), sw - 24), y = Math.min(Math.max(f.hero1.y, sw < 600 ? sh * 0.72 : sw < 900 ? sh * 0.6 : 210), sh - 110);
          id.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          if (idNameRef.current && idNameRef.current.textContent !== f.hero1.label) {
            idNameRef.current.textContent = f.hero1.label;
            if (idNRef.current) idNRef.current.textContent = `N° ${String(f.hero1.n).padStart(2, "0")}`;
          }
          if (idSubRef.current) idSubRef.current.textContent = f.hero1.hover ? "Click to bring it forward" : f.hero1.name === "camera" ? "Yours — the one with the tag" : "One object, one identity";
        }
      }
      // chapter V: catalogue cards follow the belonging in focus / under the pointer
      const card = (el: HTMLDivElement | null, name: string, x: number, y: number) => {
        if (!el) return;
        const meta = ARCHIVE_META[name];
        el.dataset.on = String(!!meta && f.arc.k > 0.5 && f.arc.u < 0.955); // the paper sheet takes over after this
        if (!meta) return;
        const sw = stage.clientWidth;
        el.dataset.flip = String(x > sw - 300);
        el.style.transform = `translate3d(${Math.min(Math.max(x, 16), sw - 16)}px, ${Math.max(y, 96)}px, 0)`;
        const code = el.querySelector<HTMLElement>("[data-code]"), nm = el.querySelector<HTMLElement>("[data-name]");
        if (code && code.textContent !== meta[0]) code.textContent = meta[0];
        if (nm && nm.textContent !== meta[1]) nm.textContent = meta[1];
      };
      card(focusCardRef.current, f.arc.hover ? "" : f.arc.focus, f.arc.fx, f.arc.fy);
      card(hoverCardRef.current, f.arc.hover, f.arc.hx, f.arc.hy);
      const ix = indexRef.current;
      if (ix) {
        const active = f.hero1.visible ? f.hero1.name : "";
        if (ix.dataset.active !== active) {
          ix.dataset.active = active;
          ix.querySelectorAll<HTMLElement>("[data-name]").forEach((b) => { b.dataset.on = String(b.dataset.name === active); });
        }
      }
    };

    const ctx = gsap.context(() => {
      // Intro: masked, staggered headline (on load, not on scroll)
      if (titleRef.current && !reduce) {
        const split = SplitText.create(titleRef.current, { type: "lines,words", mask: "lines" });
        // masks clip at the line box; pad them so cap serifs, round tops and descenders are never shaved
        gsap.set((split as any).masks ?? [], { paddingTop: "0.14em", paddingBottom: "0.16em", marginTop: "-0.14em", marginBottom: "-0.16em" });
        gsap.from(split.words, { yPercent: 115, rotate: 3, duration: 1.4, ease: "expo.out", stagger: 0.055, delay: 0.35, onComplete: () => split.revert() });
        gsap.from(".b2-s1-fade", { opacity: 0, y: 22, duration: 1.1, ease: "expo.out", stagger: 0.09, delay: 1.0 });
        gsap.from(".b2-h1x-backdrop", { opacity: 0, duration: 1.6, ease: "power2.out" });
      }

      // Master timeline: 1 unit = the whole story. Scrubbed by scroll position.
      const tl = gsap.timeline({ defaults: { ease: "none" } });
      tl.to({}, { duration: 1 }, 0);
      const set = (sel: string, from: gsap.TweenVars, to: gsap.TweenVars, at: number, dur: number) =>
        tl.fromTo(sel, from, { ...to, duration: dur, ease: "power2.inOut" }, at);
      const out = (sel: string, at: number, dur = 0.04, y = -40) => tl.to(sel, { opacity: 0, y, duration: dur, ease: "power2.in" }, at);

      // stage colour: paper → ink (instrument) → paper
      tl.fromTo(stage, { "--st-bg": "#f3efe7", "--st-fg": "#141210" }, { "--st-bg": "#141210", "--st-fg": "#f3efe7", duration: 0.1, ease: "power1.inOut" }, 0.17);
      tl.to(stage, { "--st-bg": "#1a1411", "--st-fg": "#efe6d6", duration: 0.03, ease: "power1.inOut" }, 0.86);

      // I — hero copy leaves as the camera flies in
      out(".b2-s1", 0.05, 0.08, -80);
      tl.to(".b2-h1x-backdrop", { opacity: 0, duration: 0.12, ease: "power1.in" }, 0.03);
      tl.to(".b2-s1-cue", { opacity: 0, duration: 0.02 }, 0.02);

      // II — identification
      set(".b2-s2", { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, 0.25, 0.04);
      out(".b2-s2", 0.37, 0.03);
      set(".b2-hud", { opacity: 0 }, { opacity: 1 }, 0.22, 0.04);
      tl.to(".b2-hud", { opacity: 0, duration: 0.03 }, 0.6);
      tl.fromTo(stage, { "--scan": 0 }, { "--scan": 1, duration: 0.12, ease: "none" }, 0.26);

      // III — process rail
      set(".b2-s3", { opacity: 0 }, { opacity: 1 }, 0.4, 0.03);
      out(".b2-s3", 0.6, 0.03, 0);
      tl.fromTo(".b2-rail__fill", { scaleX: 0 }, { scaleX: 1, duration: 0.2, ease: "none" }, 0.41);
      STAGES.forEach((_, i) => {
        const at = 0.405 + i * 0.042;
        set(`.b2-step-${i}`, { opacity: 0, y: 30 }, { opacity: 1, y: 0 }, at, 0.012);
        if (i < STAGES.length - 1) out(`.b2-step-${i}`, at + 0.034, 0.01, -20);
        tl.fromTo(`.b2-node-${i}`, { "--on": 0 }, { "--on": 1, duration: 0.008 }, at);
      });
      set(".b2-cloud-label", { opacity: 0 }, { opacity: 1 }, 0.49, 0.02);
      tl.to(".b2-cloud-label", { opacity: 0, duration: 0.02 }, 0.6);

      // IV — instance
      set(".b2-s4", { opacity: 0, y: 40 }, { opacity: 1, y: 0 }, 0.64, 0.04);
      set(".b2-s4-b", { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.78, 0.03);
      tl.to(".b2-s4-a .b2-s4-sub", { opacity: 0, duration: 0.02 }, 0.77);
      out(".b2-s4", 0.85, 0.03);

      // V — the lost object archive (everything here starts at p >= 0.86)
      tl.fromTo(".b2-s5", { opacity: 0 }, { opacity: 1, duration: 0.01 }, 0.87);
      tl.fromTo(".b2-arc-backdrop", { opacity: 0 }, { opacity: 1, duration: 0.03, ease: "power1.inOut" }, 0.862);
      tl.fromTo(".b2-arc__stamp", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.015, ease: "power2.out" }, 0.88);
      tl.fromTo(".b2-arc__stamp b", { "--fill": 0 }, { "--fill": 1, duration: 0.03 }, 0.885);
      tl.fromTo(".b2-arc__index", { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.015, ease: "power2.out" }, 0.886);
      tl.fromTo(".b2-arc-tab", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.015, ease: "power2.out" }, 0.895);
      tl.fromTo(".b2-arc-tab__fill", { scaleY: 0 }, { scaleY: 1, duration: 0.105, ease: "none" }, 0.895);
      // scene C: the claim slip slides across the drawer; "Show us." is stamped onto it
      tl.fromTo(".b2-arc-slip", { xPercent: -104, rotate: -4 }, { xPercent: 0, rotate: -1.6, duration: 0.014, ease: "power3.out" }, 0.946);
      tl.fromTo(".b2-arc-slip__t .b2-arc__mask > span", { yPercent: 120 }, { yPercent: 0, duration: 0.01, ease: "power3.out" }, 0.952);
      tl.fromTo(".b2-arc-slip__stamp", { opacity: 0, scale: 1.8, rotate: -18 }, { opacity: 1, scale: 1, rotate: -8, duration: 0.006, ease: "back.out(2.2)" }, 0.961);
      tl.to(".b2-arc-slip", { yPercent: -40, opacity: 0, duration: 0.01, ease: "power2.in" }, 0.973);
      tl.to([".b2-arc__index", ".b2-arc__stamp"], { opacity: 0, duration: 0.01 }, 0.975);
      // scene D → search: a sheet of archival paper rises over the archive
      tl.fromTo(".b2-arc-sheet", { yPercent: 102 }, { yPercent: 0, duration: 0.018, ease: "power2.inOut" }, 0.982);
      tl.to(stage, { "--st-bg": "#f3efe7", "--st-fg": "#141210", duration: 0.002 }, 0.998);

      // Section heights (CSS): desktop 840vh (was 640vh), small screens 740vh (was 560vh).
      // p 0 → 0.86 still spans exactly the old pixel range; the extra length belongs to chapter V.
      tl.pause();
      const remap = (f: number) => {
        const wide = window.innerWidth > 900;
        const oldH = wide ? 6.4 : 5.6, newH = wide ? 8.4 : 7.4;
        const f0 = (0.86 * (oldH - 1)) / (newH - 1);
        return f <= f0 ? (f / f0) * 0.86 : 0.86 + ((f - f0) / (1 - f0)) * 0.14;
      };
      const st = ScrollTrigger.create({
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          gsap.to(tl, { progress: remap(self.progress), duration: reduce ? 0 : 0.9, ease: "power3.out", overwrite: true });
        },
      });
      tl.progress(remap(st.progress));
      let tone = "";
      tl.eventCallback("onUpdate", () => {
        const pr = tl.progress();
        handle?.setProgress(pr);
        const next = pr > 0.2 && pr < 0.985 ? "dark" : "";
        if (next !== tone) { tone = next; if (tone) document.documentElement.dataset.navTone = tone; else delete document.documentElement.dataset.navTone; }
      });
    }, section);

    (async () => {
      const mod = await import("./storyScene");
      if (cancelled) return;
      if (!mod.webglAvailable()) { setMode("fallback"); return; }
      try {
        handle = mod.createStoryScene({
          canvas,
          container: stage,
          compact: window.innerWidth < 768,
          reducedMotion: reduce,
          onLoad: (f) => setLoadPct(Math.round(f * 100)),
          onFrame,
        });
        handleRef.current = handle;
        setMode("3d");
        handle.setActive(visible && !document.hidden);
      } catch {
        setMode("fallback");
      }
    })();

    // Only render while the story is on screen and the tab is visible.
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      handle?.setActive(visible && !document.hidden);
    });
    io.observe(section);
    const onVis = () => handle?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      ctx.revert();
      handle?.dispose();
      delete document.documentElement.dataset.navTone;
    };
  }, []);

  return (
    <section ref={sectionRef} className="b2-story" aria-label="How Back2U finds an object">
      <div ref={stageRef} className="b2-story__stage">
        {/* chapter I: studio light pool behind the installation (fades out before chapter II) */}
        <div className="b2-h1x-backdrop" aria-hidden="true" />
        <div className="b2-arc-backdrop" aria-hidden="true" />
        <canvas ref={canvasRef} className="b2-story__canvas" style={{ opacity: mode === "3d" ? 1 : 0 }} aria-hidden="true" />

        {/* ── HUD: the analysis instrument frame (chapters II–III) */}
        <div className="b2-hud" aria-hidden="true">
          <span className="b2-hud__tl b2-num">BACK2U / OBJECT ANALYSIS</span>
          <span className="b2-hud__tr b2-num">ILLUSTRATION — NOT A LIVE RESULT</span>
          <span className="b2-hud__bl b2-num">CROP 224 × 224 · EMBEDDING 256-D</span>
          <span className="b2-hud__br b2-num">DETECT → GATE → EMBED → SEARCH → RERANK</span>
          <i className="b2-hud__x" /><i className="b2-hud__y" />
        </div>

        {/* projected detection frame + markers (positions written per frame) */}
        <div ref={focusRef} className="b2-detect" data-on="false" aria-hidden="true">
          <span className="b2-vf__c b2-vf__c--tl" /><span className="b2-vf__c b2-vf__c--tr" />
          <span className="b2-vf__c b2-vf__c--bl" /><span className="b2-vf__c b2-vf__c--br" />
          <span className="b2-detect__sweep" />
          <span className="b2-detect__tag b2-num">object · camera</span>
        </div>
        {["lens", "body", "luggage tag"].map((l, i) => (
          <div key={l} ref={(el) => { markerRefs.current[i] = el; }} className="b2-marker" data-on="false" aria-hidden="true">
            <i /><span className="b2-num">{String(i + 1).padStart(2, "0")} · {l}</span>
          </div>
        ))}
        <div ref={cloudLabelRef} className="b2-cloud-label" aria-hidden="true">
          <span className="b2-num">found-item embeddings</span>
        </div>
        <div ref={scanRef} className="b2-scanbox" data-on="false" data-locked="false" aria-hidden="true">
          <span className="b2-vf__c b2-vf__c--tl" /><span className="b2-vf__c b2-vf__c--tr" />
          <span className="b2-vf__c b2-vf__c--bl" /><span className="b2-vf__c b2-vf__c--br" />
          <span ref={scanLabelRef} className="b2-scanbox__label b2-num">Candidate 01 · camera</span>
        </div>

        {/* ── I · Object universe */}
        <div className="b2-chapter b2-s1 b2-h1x">
          {mode === "fallback" && <FallbackStill />}

          {/* identification indicator — follows the object in focus (illustration, not a model result) */}
          <div ref={idRef} className="b2-h1x-id" data-on="false" aria-hidden="true">
            <i className="b2-h1x-id__lead" />
            <span className="b2-h1x-id__card">
              <span ref={idNRef} className="b2-h1x-id__n b2-num">N° 01</span>
              <span ref={idNameRef} className="b2-h1x-id__name">Camera</span>
              <span ref={idSubRef} className="b2-h1x-id__sub b2-num">One object, one identity</span>
            </span>
          </div>

          <div className="b2-container b2-s1__inner b2-h1x__inner">
            <div className="b2-h1x__meta b2-s1-fade">
              <span className="b2-label b2-label--dot">Back2U — campus lost &amp; found</span>
            </div>
            <h1 ref={titleRef} className="b2-display b2-h1x__title">
              <span className="b2-h1x__l1">Every object</span>{" "}
              <span className="b2-h1x__l2">has an identity.</span>{" "}
              <em className="b2-h1x__l3">We help you find yours.</em>
            </h1>
            <div className="b2-h1x__act b2-s1-fade">
              <p className="b2-h1x__lead">
                Show us a photo or describe what you lost. Back2U looks for the same physical object
                across every found report on campus — not just one that looks like it.
              </p>
              <div className="b2-h1x__ctas">
                <B2Button href="/search" size="lg" magnetic className="b2-h1x-cta" icon={<span className="b2-h1x-cta__ico" aria-hidden="true"><ArrowRight size={17} /></span>}>
                  Search by photo
                </B2Button>
                <B2Button href="/report/found" size="lg" variant="ghost" magnetic className="b2-h1x-ghost">I found something</B2Button>
              </div>
            </div>
          </div>

          <div className="b2-container b2-h1x__foot b2-s1-fade">
            <div ref={indexRef} className="b2-h1x-index" role="group" aria-label="Bring an object forward">
              {[["camera", "Camera"], ["headphones", "Headphones"], ["phone", "Smartphone"], ["wallet", "Wallet"], ["keys", "Keys"], ["watch", "Watch"], ["sunglasses", "Sunglasses"], ["bottle", "Bottle"], ["shoe", "Sneaker"], ["suitcase", "Suitcase"]].map(([n, l], i) => (
                <button key={n} type="button" data-name={n} data-on="false" className="b2-h1x-index__b" onClick={() => handleRef.current?.discover(n)}>
                  <span className="b2-num">{String(i + 1).padStart(2, "0")}</span>{l}
                </button>
              ))}
            </div>
            <span className="b2-label b2-s1-cue b2-h1x__cue">
              {mode !== "fallback" && loadPct < 100 ? <span className="b2-num" aria-live="polite">Loading objects {loadPct}%</span> : <><ArrowDown size={13} /> Scroll</>}
            </span>
          </div>
        </div>

        {/* ── II · Identification */}
        <div className="b2-chapter b2-s2" aria-hidden="false">
          <div className="b2-container b2-s2__inner">
            <span className="b2-label b2-st-label">Chapter 02 — Identification</span>
            <h2 className="b2-display b2-st-h">First, find the object. <em>Ignore everything else.</em></h2>
            <p className="b2-st-p">The pipeline locates the item, crops it and checks that it is a supported kind of object — so a desk, a bag or a crowded background can&rsquo;t drive the match.</p>
          </div>
        </div>

        {/* ── III · Process */}
        <div className="b2-chapter b2-s3">
          <div className="b2-container b2-s3__inner">
            <div className="b2-s3__steps">
              {STAGES.map((s, i) => (
                <div key={s.k} className={`b2-step b2-step-${i}`}>
                  <span className="b2-step__n b2-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="b2-label b2-st-label">{s.k}</span>
                  <h2 className="b2-display b2-st-h">{s.t}</h2>
                  <p className="b2-st-p">{s.d}</p>
                </div>
              ))}
            </div>
            <div className="b2-rail" aria-hidden="true">
              <span className="b2-rail__fill" />
              {STAGES.map((s, i) => (
                <span key={s.k} className={`b2-rail__node b2-node-${i}`}><i /><b className="b2-num">{s.k}</b></span>
              ))}
            </div>
          </div>
        </div>

        {/* ── IV · Instance */}
        <div className="b2-chapter b2-s4">
          <div className="b2-container b2-s4__inner">
            <div className="b2-s4-a">
              <span className="b2-label b2-st-label">Chapter 04 — Instance, not category</span>
              <h2 className="b2-display b2-st-h b2-s4__h">A camera is easy to find.</h2>
              <p className="b2-st-p b2-s4-sub">Nine cameras. Same model, same colour, same strap.</p>
            </div>
            <div className="b2-s4-b">
              <h2 className="b2-display b2-st-h b2-s4__h"><em>Yours</em> is the hard part.</h2>
              <p className="b2-st-p">Category recognition stops at &ldquo;camera&rdquo;. Instance retrieval keeps going — the scuff, the sticker, the tag on the strap — until one object is left.</p>
            </div>
          </div>
        </div>

        {/* ── V · The lost object archive */}
        <div className="b2-chapter b2-s5 b2-arc">
          <div className="b2-arc__index b2-num" aria-hidden="true">
            <span>Lost object archive</span><i /><span>Drawer 05 · A-01 — A-08</span><i /><span>Catalogued · awaiting owners</span>
          </div>
          <div className="b2-arc__stamp" aria-hidden="true">
            <span className="b2-num">Chapter</span>
            <b>05</b>
            <span className="b2-num">Your turn</span>
          </div>

          {/* scene C: the headline as a lost-property claim slip */}
          <div className="b2-arc-slip">
            <div className="b2-arc-slip__meta b2-num" aria-hidden="true">
              <span>B2U · Form 05 — Claim slip</span><span>Item ________</span><span>Last seen ________</span><span>N° 0005</span>
            </div>
            <h2 className="b2-arc-slip__t">
              <span className="b2-arc__mask"><span>Lost something?</span></span>{" "}
              <em className="b2-arc-slip__stamp">Show us.</em>
            </h2>
            <i className="b2-arc-slip__perf" aria-hidden="true" />
          </div>

          {/* scroll cue: an index tab on the archive's edge */}
          <div className="b2-arc-tab">
            <span className="b2-arc-tab__rail" aria-hidden="true"><span className="b2-arc-tab__fill" /></span>
            <span className="b2-arc-tab__body">
              <span className="b2-num b2-arc-tab__k">Next drawer: search ↓</span>
              <span>Keep scrolling — the search starts right below.</span>
            </span>
          </div>

          {/* scene D: archival paper rises into the search section */}
          <div className="b2-arc-sheet" aria-hidden="true">
            <i className="b2-arc-sheet__perf" />
            <span className="b2-num">Form 05 · continue below — start a search ↓</span>
          </div>
        </div>

        {/* catalogue cards (positions written per frame) */}
        <div ref={focusCardRef} className="b2-arc-card" data-on="false" aria-hidden="true">
          <span className="b2-num" data-code>A-01</span><b data-name>Headphones</b><span className="b2-arc-card__s">Catalogued · awaiting its owner</span>
        </div>
        <div ref={hoverCardRef} className="b2-arc-card b2-arc-card--hover" data-on="false" aria-hidden="true">
          <span className="b2-num" data-code>A-01</span><b data-name>Headphones</b><span className="b2-arc-card__s">Is this yours? Search below</span>
        </div>
      </div>
    </section>
  );
}
