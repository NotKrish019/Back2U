"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Link2, RefreshCw, X } from "lucide-react";

const MAX_BYTES = 10 * 1024 * 1024;
const EASE = [0.16, 1, 0.3, 1] as const;

type Props = {
  value: string;                 // data URL (or http URL) — same value the pages already send to the API
  onChange: (v: string) => void;
  label?: string;
  hint?: string;
  allowUrl?: boolean;            // keeps the existing "provide URL" demo affordance on report pages
  tall?: boolean;
  variant?: "light" | "canvas";  // "canvas": the dark analysis canvas used on /search
  layoutId?: string;             // shared-element id so the photo can travel between views
};

/** Drag-and-drop / click / paste photo input. Produces a data URL exactly like the original FileReader code. */
export default function PhotoDrop({ value, onChange, label = "Add a photo", hint = "Drop an image, paste one, or browse", allowUrl = false, tall = false, variant = "light", layoutId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [broken, setBroken] = useState(false);
  const [fileName, setFileName] = useState("");
  // Real file facts only (shown on the canvas variant) — never invented analysis.
  const [meta, setMeta] = useState<{ bytes?: number; type?: string; w?: number; h?: number }>({});

  const read = useCallback((file: File | undefined | null) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/") || /\.(heic|heif)$/i.test(file.name);
    if (!isImage) { setError("That file isn't an image. Try a JPG, PNG or HEIC photo."); return; }
    if (file.size > MAX_BYTES) { setError(`That photo is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`); return; }
    setError("");
    setReading(true);
    setBroken(false);
    setFileName(file.name);
    setMeta({ bytes: file.size, type: (file.type.split("/")[1] || file.name.split(".").pop() || "").toUpperCase() });
    const reader = new FileReader();
    reader.onloadend = () => {
      setReading(false);
      onChange(reader.result as string);
    };
    reader.onerror = () => { setReading(false); setError("Couldn't read that file. Try another photo."); };
    reader.readAsDataURL(file);
  }, [onChange]);

  // paste an image from the clipboard while the zone (or anything inside it) has focus
  useEffect(() => {
    const zone = zoneRef.current;
    if (!zone) return;
    const onPaste = (e: ClipboardEvent) => {
      const f = Array.from(e.clipboardData?.files ?? []).find((x) => x.type.startsWith("image/"));
      if (f) { e.preventDefault(); read(f); }
    };
    zone.addEventListener("paste", onPaste);
    return () => zone.removeEventListener("paste", onPaste);
  }, [read]);

  const open = () => inputRef.current?.click();

  return (
    <div className="b2-drop-wrap">
      <div
        ref={zoneRef}
        className={`b2-drop ${tall ? "b2-drop--tall" : ""} ${variant === "canvas" ? "b2-drop--canvas" : ""}`}
        data-drag={drag}
        data-filled={!!value}
        role="button"
        tabIndex={0}
        aria-describedby={`${id}-hint ${id}-err`}
        aria-label={value ? "Replace photo" : label}
        onClick={open}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } }}
        onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
        onDrop={(e) => { e.preventDefault(); setDrag(false); read(e.dataTransfer.files?.[0]); }}
      >
        <span className="b2-drop__corners" aria-hidden="true">
          <span className="b2-vf__c b2-vf__c--tl" /><span className="b2-vf__c b2-vf__c--tr" />
          <span className="b2-vf__c b2-vf__c--bl" /><span className="b2-vf__c b2-vf__c--br" />
        </span>

        <AnimatePresence mode="wait" initial={false}>
          {value ? (
            <motion.div
              key="filled"
              className="b2-drop__preview"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              {broken ? (
                <div className="b2-noimg">Preview unavailable for this format{fileName ? ` · ${fileName}` : ""} — it will still be sent</div>
              ) : (
                <motion.img
                  src={value}
                  alt="Your photo"
                  layoutId={layoutId}
                  onError={() => setBroken(true)}
                  onLoad={(e) => { const im = e.currentTarget; setMeta((m) => ({ ...m, w: im.naturalWidth, h: im.naturalHeight })); }}
                  initial={variant === "canvas" ? { scale: 1.12, filter: "blur(14px)", opacity: 0 } : false}
                  animate={{ scale: 1, filter: "blur(0px)", opacity: 1 }}
                  transition={{ duration: 0.9, ease: EASE }}
                />
              )}
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              className="b2-drop__empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="b2-drop__icon"><ImagePlus size={22} strokeWidth={1.5} /></span>
              <span className="b2-display b2-drop__title">{drag ? "Drop it here" : label}</span>
              <span id={`${id}-hint`} className="b2-drop__hint">{hint}</span>
              <span className="b2-label">JPG · PNG · HEIC — up to 10 MB</span>
            </motion.div>
          )}
        </AnimatePresence>
        {reading && <span className="b2-drop__reading" aria-live="polite">Reading photo…</span>}
        {variant === "canvas" && value && !broken && (
          <>
            <span key={value.slice(-32)} className="b2-drop__sweep" aria-hidden="true" />
            <span className="b2-drop__meta b2-num" aria-hidden="true">
              <span>Query image</span>
              <span>
                {meta.w && meta.h ? `${meta.w} × ${meta.h}px` : "—"}
                {meta.bytes ? ` · ${(meta.bytes / 1048576).toFixed(1)} MB` : ""}
                {meta.type ? ` · ${meta.type}` : ""}
              </span>
            </span>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        hidden
        onChange={(e) => { read(e.target.files?.[0]); e.target.value = ""; }}
      />

      <div className="b2-drop__bar">
        <p id={`${id}-err`} className="b2-field__error" role={error ? "alert" : undefined}>{error}</p>
        <div className="flex gap-2 ml-auto">
          {value && (
            <>
              <button type="button" className="b2-btn b2-btn--ghost b2-btn--sm" onClick={open}><RefreshCw size={14} />Replace</button>
              <button type="button" className="b2-btn b2-btn--ghost b2-btn--sm" onClick={() => { onChange(""); setFileName(""); setBroken(false); }}><X size={14} />Remove</button>
            </>
          )}
          {!value && allowUrl && (
            <button
              type="button"
              className="b2-btn b2-btn--ghost b2-btn--sm"
              onClick={() => {
                const url = prompt("Enter image URL for demo:");
                if (url) onChange(url);
              }}
            >
              <Link2 size={14} />Use an image URL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
