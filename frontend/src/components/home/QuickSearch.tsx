"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus, RefreshCw, X } from "lucide-react";
import type { PortalFrame, PortalHandle, PortalState } from "@/components/portal/portalScene";

export const DRAFT_KEY = "back2u:searchDraft";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Home-page search entry — "The Identification Portal".
 * Behaviour is unchanged from the previous section: nothing is sent to the backend from here.
 * The draft (photo + words) is handed to /search, which still asks for name, place and date and
 * runs the normal report + retrieval flow. The final visual state ("handing") lasts only while the
 * browser navigates to /search.
 */
export default function QuickSearch() {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const inviteRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<PortalHandle | null>(null);

  const [image, setImage] = useState("");
  const [desc, setDesc] = useState("");
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);
  const [handing, setHanding] = useState(false);
  const [mode, setMode] = useState<"loading" | "3d" | "flat">("loading");
  const [meta, setMeta] = useState<{ bytes?: number; type?: string; w?: number; h?: number; noPreview?: boolean }>({});

  const state: PortalState = handing ? "handing" : drag ? "drag" : image ? "loaded" : "empty";

  // ---------------------------------------------------------------- file intake (same rules as before)
  const read = useCallback((file: File | undefined | null) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
    if (!isImage) { setErr("That file isn't an image. Try a JPG, PNG or HEIC photo."); return; }
    if (file.size > MAX_BYTES) { setErr(`That photo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`); return; }
    setErr("");
    setMeta({ bytes: file.size, type: (file.type.split("/")[1] || file.name.split(".").pop() || "").toUpperCase() });
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.onerror = () => setErr("Couldn't read that file. Try another photo.");
    reader.readAsDataURL(file);
  }, []);

  // paste anywhere in the section
  useEffect(() => {
    const sec = sectionRef.current;
    if (!sec) return;
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" && !e.clipboardData?.files?.length) return;
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); read(f); }
    };
    sec.addEventListener("paste", onPaste);
    return () => sec.removeEventListener("paste", onPaste);
  }, [read]);

  // ---------------------------------------------------------------- the instrument (3D)
  useEffect(() => {
    const section = sectionRef.current, stage = stageRef.current, canvas = canvasRef.current;
    if (!section || !stage || !canvas) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let handle: PortalHandle | null = null, cancelled = false, visible = false;
    let revert: (() => void) | undefined;

    const onFrame = (f: PortalFrame) => {
      const z = zoneRef.current, inv = inviteRef.current;
      if (z) {
        z.style.left = `${f.rect.x}px`; z.style.top = `${f.rect.y}px`;
        z.style.width = `${f.rect.w}px`; z.style.height = `${f.rect.h}px`;
        // hit area = the plate's actual perspective quad
        z.style.clipPath = `polygon(${f.quad.map(([x, y]) => `${(x - f.rect.x).toFixed(1)}px ${(y - f.rect.y).toFixed(1)}px`).join(",")})`;
      }
      if (inv) inv.style.transform = `translate3d(${f.center.x}px, ${f.center.y}px, 0) translate(-50%, -50%)`;
    };

    (async () => {
      const mod = await import("@/components/portal/portalScene");
      if (cancelled) return;
      if (!mod.webglOK()) { setMode("flat"); return; }
      handle = mod.createPortalScene({ canvas, container: stage, compact: window.innerWidth < 900, reducedMotion: reduce, onFrame });
      handleRef.current = handle;
      setMode("3d");
      if (reduce) handle.setEnter(1);
      handle.setActive(visible && !document.hidden);
      if (!reduce) {
        const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          // entrance: the instrument rises and powers on as the section scrolls in
          const st = ScrollTrigger.create({ trigger: section, start: "top 85%", end: "top 15%", scrub: 0.8, onUpdate: (t) => handleRef.current?.setEnter(t.progress) });
          handleRef.current?.setEnter(st.progress);
          // headline words + readouts ride the same approach
          const tl = gsap.timeline({ scrollTrigger: { trigger: section, start: "top 80%", end: "top 25%", scrub: 0.8 } });
          tl.fromTo(".b2-portal__w > span", { yPercent: 115 }, { yPercent: 0, stagger: 0.06, ease: "power3.out" }, 0)
            .fromTo(".b2-portal__legend li", { opacity: 0, x: -24 }, { opacity: 1, x: 0, stagger: 0.08, ease: "power2.out" }, 0.2)
            .fromTo(".b2-portal__card", { opacity: 0, y: 40, rotate: 2 }, { opacity: 1, y: 0, rotate: 0, ease: "power2.out" }, 0.3);
        }, section);
        revert = () => ctx.revert();
      }
    })();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; handle?.setActive(visible && !document.hidden); }, { rootMargin: "120px 0px" });
    io.observe(section);
    const onVis = () => handle?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; io.disconnect(); document.removeEventListener("visibilitychange", onVis); revert?.(); handle?.dispose(); handleRef.current = null; };
  }, []);

  // keep the scene in sync with real UI state
  useEffect(() => { handleRef.current?.setState(state); }, [state, mode]);
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    h.setImage(image || null, (ok, w, hh) => setMeta((m) => ({ ...m, w, h: hh, noPreview: !ok })));
  }, [image, mode]);
  // flat mode (no WebGL): read real dimensions from the <img>
  const onFlatLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget; setMeta((m) => ({ ...m, w: im.naturalWidth, h: im.naturalHeight }));
  };

  const open = () => inputRef.current?.click();
  const clear = () => { setImage(""); setMeta({}); setErr(""); };

  const go = () => {
    if (!image && !desc.trim()) { setErr("Add a photo or a few words to start."); return; }
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ image, desc }));
    } catch {
      // storage full (large photo) — continue with the words only
      try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ image: "", desc })); } catch { /* unavailable */ }
    }
    setHanding(true);
    router.push("/search");
  };

  const status =
    handing ? "Opening the search…"
    : drag ? "Release to place the photo"
    : image ? (meta.noPreview ? "Photo attached — no preview for this format" : "Photograph placed")
    : desc.trim() ? "Words only — that works too"
    : "Awaiting a photograph";

  return (
    <section ref={sectionRef} className="b2-portal" data-state={state} data-mode={mode} aria-labelledby="quick-title" id="start">
      <div className="b2-container">
        <header className="b2-portal__head">
          <div className="b2-portal__meta b2-num">
            <span className="b2-portal__dot" />Start a search<i />Identification portal<i /><span className="b2-portal__st">Station 06</span>
          </div>
          <h2 id="quick-title" className="b2-display b2-portal__title">
            {["Drop", "the", "photo."].map((w) => <span key={w} className="b2-portal__w"><span>{w}</span></span>)}{" "}
            <em>{["We’ll", "do", "the", "looking."].map((w) => <span key={w} className="b2-portal__w"><span>{w}</span></span>)}</em>
          </h2>
        </header>
      </div>

      <div className="b2-portal__body">
        {/* how a query is read — the real pipeline, in plain words */}
        <ol className="b2-portal__legend" aria-label="What Back2U reads">
          <li><b className="b2-num">01</b><span><strong>A photo</strong> finds this exact object, not just its kind.</span></li>
          <li><b className="b2-num">02</b><span><strong>Words</strong> are matched against every found photo.</span></li>
          <li><b className="b2-num">03</b><span><strong>Both</strong> are combined into one ranked list.</span></li>
          <li className="b2-portal__fine">Any photo of the item works — even an old one from your camera roll. No photo? Describe it instead.</li>
        </ol>

        {/* the instrument */}
        <div ref={stageRef} className="b2-portal__stage">
          <canvas ref={canvasRef} className="b2-portal__canvas" aria-hidden="true" />
          {mode === "flat" && image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="b2-portal__flatimg" src={image} alt="Your photo" onLoad={onFlatLoad} onError={() => setMeta((m) => ({ ...m, noPreview: true }))} />
          )}
          <div
            ref={zoneRef}
            className="b2-portal__zone"
            role="button"
            tabIndex={0}
            aria-label={image ? "Replace photo" : "Add a photo: drop, paste, or press Enter to browse"}
            onClick={open}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
            onFocus={() => handleRef.current?.setFocus(true)}
            onBlur={() => handleRef.current?.setFocus(false)}
            onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
            onDrop={(e) => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files?.[0]); }}
          />
          <div ref={inviteRef} className="b2-portal__invite" aria-hidden="true">
            <span className="b2-portal__ico"><ImagePlus size={20} strokeWidth={1.5} /></span>
            <b>{drag ? "Release to place it" : "Place your photograph here"}</b>
            <span>Drop · paste · or click to browse</span>
            <span className="b2-num">JPG · PNG · HEIC — up to 10 MB</span>
          </div>
          <input ref={inputRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => { read(e.target.files?.[0]); e.target.value = ""; }} />
          {/* real readout */}
          <div className="b2-portal__readout b2-num" aria-live="polite">
            <span className="b2-portal__led" />{status}
            {image && meta.w ? <em>{meta.w} × {meta.h}px{meta.bytes ? ` · ${(meta.bytes / 1048576).toFixed(1)} MB` : ""}{meta.type ? ` · ${meta.type}` : ""}</em> : null}
          </div>
        </div>

        {/* specimen card: description + action */}
        <div className="b2-portal__card">
          <div className="b2-portal__cardhead b2-num"><span>Specimen card</span><span>Form 06</span></div>
          <div className="b2-portal__photo-row">
            <span className="b2-portal__k b2-num">Field 01 · Photo</span>
            {image ? (
              <span className="b2-portal__ctl">
                <button type="button" onClick={open}><RefreshCw size={13} />Replace</button>
                <button type="button" onClick={clear}><X size={13} />Remove</button>
              </span>
            ) : (
              <button type="button" className="b2-portal__browse" onClick={open}><ImagePlus size={13} />Browse</button>
            )}
          </div>
          <label htmlFor="q-desc" className="b2-portal__k b2-num">Field 02 · Describe it <i>optional with a photo</i></label>
          <textarea
            id="q-desc"
            value={desc}
            onChange={(e) => { setDesc(e.target.value); setErr(""); }}
            placeholder="Black film camera, brown leather strap, pink luggage tag…"
            rows={4}
          />
          <p className="b2-portal__err" role={err ? "alert" : undefined}>{err}</p>
          <button type="button" className="b2-portal__go" onClick={go} disabled={handing}>
            <span>{handing ? "Opening search…" : "Continue to search"}</span>
            <span className="b2-portal__goico"><ArrowRight size={17} /></span>
          </button>
          <p className="b2-portal__note">Next you&rsquo;ll add where and when; then Back2U searches every found report.</p>
        </div>
      </div>
    </section>
  );
}
