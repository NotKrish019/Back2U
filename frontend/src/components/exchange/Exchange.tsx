"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ExchangeHandle } from "./exchangeScene";

export default function Exchange() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ExchangeHandle | null>(null);
  const [mode, setMode] = useState<"loading" | "3d" | "static">("loading");
  const [emph, setEmph] = useState<"" | "owner" | "finder">("");

  useEffect(() => {
    const section = sectionRef.current, track = trackRef.current, stage = stageRef.current, canvas = canvasRef.current;
    if (!section || !track || !stage || !canvas) return;
    const sec: HTMLElement = section, trk: HTMLDivElement = track;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let handle: ExchangeHandle | null = null, cancelled = false, visible = false;
    let revert: (() => void) | undefined;

    function choreograph() {
      (async () => {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          const tl = gsap.timeline({ defaults: { ease: "none" } });
          tl.to({}, { duration: 1 }, 0);
          // opening — the exhibit label and headline
          tl.fromTo(".b2-ex__label", { opacity: 0 }, { opacity: 1, duration: 0.04 }, 0.02);
          tl.fromTo(".b2-ex__ln > span", { yPercent: 120 }, { yPercent: 0, duration: 0.08, stagger: 0.05, ease: "power3.out" }, 0.04);
          tl.fromTo(".b2-ex__lead", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.05 }, 0.14);
          // discovery / connection — small captions follow the story
          [["a", 0.18], ["b", 0.34], ["c", 0.5]].forEach(([k, at]) => {
            tl.fromTo(`.b2-ex-note--${k}`, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.04 }, at as number);
            tl.to(`.b2-ex-note--${k}`, { opacity: 0, y: -8, duration: 0.03 }, (at as number) + (k === "c" ? 0.2 : 0.12));
          });
          // resolution — the two pathways
          tl.fromTo(".b2-ex-path--owner", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1, ease: "power3.out" }, 0.76);
          tl.fromTo(".b2-ex-path--finder", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 0.1, ease: "power3.out" }, 0.82);
          ScrollTrigger.create({ trigger: trk, start: "top top", end: "bottom bottom", scrub: 0.9, animation: tl, invalidateOnRefresh: true });
          tl.eventCallback("onUpdate", () => handleRef.current?.setProgress(tl.progress()));
        }, sec);
        revert = () => ctx.revert();
      })();
    }

    (async () => {
      const mod = await import("./exchangeScene");
      if (cancelled) return;
      if (!mod.webglOK()) { setMode("static"); sec.dataset.q = "1"; return; }
      handle = mod.createExchangeScene({ canvas, container: stage, vertical: window.innerWidth < 760, reducedMotion: reduce });
      handleRef.current = handle;
      setMode("3d");
      if (reduce) { handle.setProgress(1); sec.dataset.q = "1"; } else choreograph();
      handle.setActive(visible && !document.hidden);
    })();
    if (reduce) sec.dataset.q = "1";

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; handle?.setActive(visible && !document.hidden); }, { rootMargin: "150px 0px" });
    io.observe(section);
    const onVis = () => handle?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; io.disconnect(); document.removeEventListener("visibilitychange", onVis); revert?.(); handle?.dispose(); handleRef.current = null; };
  }, []);

  const emphasise = (s: "" | "owner" | "finder") => { setEmph(s); handleRef.current?.setEmphasis(s); };
  // keyboard: tabbing to a pathway scrolls the exhibit to its resolution
  const revealPaths = () => {
    const sec = sectionRef.current, trk = trackRef.current;
    if (!trk || sec?.dataset.q === "1") return;
    const top = trk.getBoundingClientRect().top + window.scrollY;
    const target = top + 0.95 * (trk.offsetHeight - window.innerHeight);
    if (Math.abs(window.scrollY - target) > 40) window.scrollTo({ top: target, behavior: "auto" });
  };

  return (
    <section ref={sectionRef} className="b2-ex" data-mode={mode} data-emph={emph} aria-labelledby="ex-title">
      <div ref={trackRef} className="b2-ex__track">
        <div ref={stageRef} className="b2-ex__stage">
          <div className="b2-ex__room" aria-hidden="true" />
          <canvas ref={canvasRef} className="b2-ex__canvas" aria-hidden="true" style={{ opacity: mode === "3d" ? 1 : 0 }} />

          <header className="b2-ex__head">
            <span className="b2-ex__label b2-num"><i />02 — Two sides of every item<b>Exhibit 02</b></span>
            <h2 id="ex-title" className="b2-ex__title">
              <span className="b2-ex__ln"><span>Someone lost it.</span></span>
              <span className="b2-ex__ln b2-ex__ln--2"><span><em>Someone found it.</em></span></span>
            </h2>
          </header>
          <p className="b2-ex__lead">Back2U sits between the two. <em>Pick the side you&rsquo;re on.</em></p>

          {/* story captions */}
          <p className="b2-ex-note b2-ex-note--a b2-num" aria-hidden="true"><b>A</b> The shape it left behind.</p>
          <p className="b2-ex-note b2-ex-note--b b2-num" aria-hidden="true"><b>B</b> The thing someone picked up.</p>
          <p className="b2-ex-note b2-ex-note--c b2-num" aria-hidden="true"><b>↔</b> One tag, two people.</p>

          <div className="b2-ex__paths">
            <Link
              href="/report/lost"
              className="b2-ex-path b2-ex-path--owner"
              onMouseEnter={() => emphasise("owner")} onMouseLeave={() => emphasise("")}
              onFocus={() => { emphasise("owner"); revealPaths(); }} onBlur={() => emphasise("")}
            >
              <span className="b2-ex-path__k b2-num">For the owner · 02·A</span>
              <span className="b2-ex-path__t">I lost something.</span>
              <span className="b2-ex-path__d">File a report with a photo or a description. New finds are checked against it automatically.</span>
              <span className="b2-ex-path__go">Report a lost item <span className="b2-ex-path__ico"><ArrowRight size={16} /></span></span>
            </Link>
            <Link
              href="/report/found"
              className="b2-ex-path b2-ex-path--finder"
              onMouseEnter={() => emphasise("finder")} onMouseLeave={() => emphasise("")}
              onFocus={() => { emphasise("finder"); revealPaths(); }} onBlur={() => emphasise("")}
            >
              <span className="b2-ex-path__k b2-num">For the finder · 02·B</span>
              <span className="b2-ex-path__t">I found <em>something.</em></span>
              <span className="b2-ex-path__d">Photograph it and say where. Matching lost reports are flagged for staff to verify ownership.</span>
              <span className="b2-ex-path__go">Report a found item <span className="b2-ex-path__ico"><ArrowRight size={16} /></span></span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
