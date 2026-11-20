'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowRight, Check } from 'lucide-react';
import DatePicker from "react-datepicker";
import { api, ReportCreate } from '@/services/api';
import PhotoDrop from '@/components/upload/PhotoDrop';
import { B2Button, SplitHeading } from '@/components/brand/primitives';

const EASE = [0.16, 1, 0.3, 1] as const;

interface ReportForm {
  item: string;
  details: string;
  location: string;
  date: Date | null;
  image: string;
}

/** Pull a readable message out of the API error (the client throws `Error(await res.text())`). */
function readError(err: unknown): { msg: string; auth: boolean } {
  const raw = err instanceof Error ? err.message : "An error occurred";
  let msg = raw;
  try { const j = JSON.parse(raw); if (typeof j?.detail === 'string') msg = j.detail; } catch { /* plain text */ }
  const auth = /not authenticated|unauthori[sz]ed|401|token/i.test(raw);
  return { msg: auth ? "You need to be logged in to file a report." : msg, auth };
}

const COPY = {
  lost: {
    kicker: "Report lost · A detail remembered",
    title: <>Let&rsquo;s bring it <em>back.</em></>,
    lead: "Tell us what you lost. Every detail can help us recognise it when it appears.",
    sheet: "Lost-item report",
    photoK: "The last picture of it",
    itemQ: "What went missing?", itemPh: "e.g. Black canvas backpack",
    whereQ: "Where did it happen?",
    submit: "Submit lost-item report", after: "After you submit, we’ll search the found reports straight away.",
  },
  found: {
    kicker: "Report found · A detail documented",
    title: <>Let&rsquo;s get it <em>home.</em></>,
    lead: "Document what you found. A clear photograph and a few details can help us reconnect it with its owner.",
    sheet: "Found-item intake",
    photoK: "Plate 01 · the object as found",
    itemQ: "What did you find?", itemPh: "e.g. Silver water bottle",
    whereQ: "Where did you find it?",
    submit: "Submit found-item report", after: "Matching lost reports are flagged for staff to verify ownership.",
  },
};

/** Background art, one per page — drawn in on load, drifting slightly with the pointer. */
function Backdrop({ type }: { type: 'lost' | 'found' }) {
  if (type === 'lost') {
    return (
      <svg className="b2-rj-bg__art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {/* contour lines — like the memory of a shape */}
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} className="b2-rj-contour" style={{ animationDelay: `${i * 90}ms` }}
            d={`M ${-40} ${180 + i * 64} C 300 ${120 + i * 70}, 520 ${260 + i * 58}, 820 ${200 + i * 66} S 1260 ${150 + i * 72}, 1500 ${230 + i * 60}`} />
        ))}
        {/* the pink thread: from the headline toward the photo frame */}
        <path className="b2-rj-thread" d="M 1180 120 C 1300 260, 1050 330, 1120 470 S 980 700, 760 640" />
      </svg>
    );
  }
  return (
    <svg className="b2-rj-bg__art" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {/* registration marks + a light catalogue grid */}
      {[[120, 120], [1320, 120], [120, 820], [1320, 820]].map(([x, y], i) => (
        <g key={i} className="b2-rj-reg" style={{ animationDelay: `${i * 120}ms` }} transform={`translate(${x} ${y})`}>
          <circle r="14" /><line x1="-24" y1="0" x2="24" y2="0" /><line x1="0" y1="-24" x2="0" y2="24" />
        </g>
      ))}
      {Array.from({ length: 13 }, (_, i) => <line key={"v" + i} className="b2-rj-gridline" x1={120 + i * 100} y1="0" x2={120 + i * 100} y2="900" />)}
      {Array.from({ length: 9 }, (_, i) => <line key={"h" + i} className="b2-rj-gridline" x1="0" y1={100 + i * 100} x2="1440" y2={100 + i * 100} />)}
    </svg>
  );
}

export default function ReportFlow({ type }: { type: 'lost' | 'found' }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const c = COPY[type];

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<{ item?: string; location?: string; date?: string }>({});
  const [submitError, setSubmitError] = useState<{ msg: string; auth: boolean } | null>(null);
  const [drag, setDrag] = useState(false);
  const [form, setForm] = useState<ReportForm>({ item: "", details: "", location: "", date: null, image: "" });
  const datePickerRef = useRef<DatePicker>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const update = (key: keyof ReportForm, value: unknown) => setForm((cur) => ({ ...cur, [key]: value }));

  // the background drifts a few pixels with the pointer
  useEffect(() => {
    const el = rootRef.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--px", String((e.clientX / window.innerWidth - 0.5) * 2));
        el.style.setProperty("--py", String((e.clientY / window.innerHeight - 0.5) * 2));
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => { window.removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
  }, []);

  // ---------------------------------------------------------------- submit (same rules + payload as before)
  const submit = async () => {
    const next: typeof errors = {};
    if (!form.item.trim()) next.item = "Add an item name before continuing.";
    if (!form.location.trim()) next.location = "Please add a location before continuing.";
    if (!form.date) next.date = "Please add a date before continuing.";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = next.item ? "r-item" : next.location ? "r-loc" : "r-date";
      const el = document.getElementById(first);
      el?.focus();
      el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      return;
    }
    setLoading(true);
    setSubmitError(null);
    try {
      const formData: ReportCreate = {
        report_type: type,
        item_category: form.item,
        description: form.details,
        location: `${form.location} (${form.date?.toLocaleString()})`,
        image_reference: form.image
      };
      await api.createReport(formData);

      if (type === 'lost') {
        // Hand the photo to /search so matching uses the image, not just the description.
        try {
          if (form.image.startsWith('data:image')) sessionStorage.setItem('back2u:lostQueryImage', form.image);
        } catch { /* storage full or unavailable: /search falls back to text-only */ }
        router.push(`/search?desc=${encodeURIComponent(form.item + ' ' + form.details)}`);
      } else {
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }
    } catch (err: unknown) {
      setSubmitError(readError(err));
    } finally {
      setLoading(false);
    }
  };

  const req = [
    { k: "Item name", ok: !!form.item.trim(), id: "r-item" },
    { k: "Location", ok: !!form.location.trim(), id: "r-loc" },
    { k: "Date & time", ok: !!form.date, id: "r-date" },
  ];
  const ready = req.every((r) => r.ok);
  const rise = (i: number) => ({
    initial: { opacity: 0, y: reduce ? 0 : 22 },
    animate: { opacity: 1, y: 0 },
    transition: reduce ? { duration: 0 } : { duration: 0.8, delay: 0.15 + i * 0.08, ease: EASE },
  });

  return (
    <div ref={rootRef} className={`b2-rj b2-rj--${type}`} data-drag={drag} data-ready={ready}>
      <div className="b2-rj-bg" aria-hidden="true"><Backdrop type={type} /></div>

      <div className="b2-container b2-rj__wrap">
        <header className="b2-rj__head">
          <motion.span className="b2-label b2-label--dot" {...rise(0)}>{c.kicker}</motion.span>
          <SplitHeading className="b2-rj__title">{c.title}</SplitHeading>
          <motion.p className="b2-rj__lead" {...rise(1)}>{c.lead}</motion.p>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          {submitted ? (
            <motion.section key="done" className="b2-rj-sheet b2-rj-done" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE }}>
              {form.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.image} alt="" className="b2-rj-done__img" />
              )}
              <div className="b2-rj-done__copy">
                <span className="b2-rj-done__mark"><Check size={20} /></span>
                <span className="b2-label">Report submitted</span>
                <h2 className="b2-rj-done__t">Nice. <em>It&rsquo;s on the campus radar.</em></h2>
                <p className="b2-rj__lead">Thanks for helping a campus item find its way home. We&rsquo;ll keep you posted if someone recognises it.</p>
                <div className="flex flex-wrap gap-3 mt-3">
                  <B2Button href="/reports" size="lg" icon={<ArrowRight size={18} />}>View my reports</B2Button>
                  <B2Button href="/" size="lg" variant="ghost">Back to home</B2Button>
                </div>
              </div>
            </motion.section>
          ) : (
            <motion.form key="form" className="b2-rj-sheet" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate {...rise(2)}>
              <div className="b2-rj-sheet__bar b2-num" aria-hidden="true">
                <span>{c.sheet}</span><span>Back2U · Form {type === "lost" ? "L" : "F"}-01</span>
              </div>

              <div className="b2-rj-sheet__grid">
                {/* the photograph — the centrepiece */}
                <motion.section className="b2-rj-photo" aria-labelledby="g-photo" {...rise(3)}>
                  <div className="b2-rj-k"><span className="b2-num">01</span><h2 id="g-photo">Upload a photo of the item</h2><span className="b2-rj-opt">Optional</span></div>
                  <p className="b2-rj-help">{c.photoK} — a clear photo makes the report much easier to recognise.</p>
                  <div
                    className="b2-rj-photo__frame"
                    onDragEnterCapture={() => setDrag(true)}
                    onDragLeaveCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDrag(false); }}
                    onDropCapture={() => setDrag(false)}
                  >
                    {type === "lost" && !form.image && (
                      <svg className="b2-rj-ghost" viewBox="0 0 200 120" aria-hidden="true">
                        <rect x="20" y="30" width="160" height="80" rx="12" />
                        <rect x="34" y="16" width="40" height="18" rx="4" />
                        <circle cx="108" cy="70" r="30" /><circle cx="108" cy="70" r="18" />
                      </svg>
                    )}
                    {type === "found" && <span className="b2-rj-photo__ruler" aria-hidden="true" />}
                    <PhotoDrop value={form.image} onChange={(v) => update("image", v)} allowUrl tall label="Upload a photo of the item" hint="Drag it here, paste it, or browse your device" />
                  </div>
                </motion.section>

                {/* the details */}
                <div className="b2-rj-fields">
                  <motion.section className="b2-rj-group" aria-labelledby="g-item" {...rise(4)}>
                    <div className="b2-rj-k"><span className="b2-num">02</span><h2 id="g-item">{c.itemQ}</h2><span className="b2-rj-req">Required</span></div>
                    <div className="b2-field" data-invalid={errors.item ? "true" : undefined}>
                      <label htmlFor="r-item" className="b2-rj-label">Item name</label>
                      <input id="r-item" className="b2-rj-input b2-rj-input--title" value={form.item} onChange={(e) => { update("item", e.target.value); setErrors((p) => ({ ...p, item: undefined })); }} placeholder={c.itemPh} aria-invalid={!!errors.item} />
                      <AnimatePresence>{errors.item && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="b2-field__error" role="alert"><AlertCircle size={14} />{errors.item}</motion.p>}</AnimatePresence>
                    </div>
                  </motion.section>

                  <motion.section className="b2-rj-group" aria-labelledby="g-details" {...rise(5)}>
                    <div className="b2-rj-k"><span className="b2-num">03</span><h2 id="g-details">What should someone notice?</h2><span className="b2-rj-opt">Optional</span></div>
                    <div className="b2-field">
                      <label htmlFor="r-details" className="b2-rj-label">Description · colour, markings, stickers, scuffs</label>
                      <textarea id="r-details" className="b2-rj-input b2-rj-input--area" value={form.details} onChange={(e) => update("details", e.target.value)} placeholder="Add a few details that make this item recognisable..." />
                    </div>
                  </motion.section>

                  <motion.section className="b2-rj-group" aria-labelledby="g-where" {...rise(6)}>
                    <div className="b2-rj-k"><span className="b2-num">04</span><h2 id="g-where">{c.whereQ}</h2><span className="b2-rj-req">Required</span></div>
                    <div className="b2-rj-pair">
                      <div className="b2-field" data-invalid={errors.location ? "true" : undefined}>
                        <label htmlFor="r-loc" className="b2-rj-label">Location · closest campus spot</label>
                        <input id="r-loc" className="b2-rj-input" type="text" value={form.location} onChange={(e) => { update("location", e.target.value); setErrors((p) => ({ ...p, location: undefined })); }} placeholder="e.g. Library, Cafe" aria-invalid={!!errors.location} />
                        <AnimatePresence>{errors.location && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="b2-field__error" role="alert"><AlertCircle size={14} />{errors.location}</motion.p>}</AnimatePresence>
                      </div>
                      <div className="b2-field" data-invalid={errors.date ? "true" : undefined}>
                        <label htmlFor="r-date" className="b2-rj-label">When · approximate date & time</label>
                        <DatePicker
                          id="r-date"
                          selected={form.date}
                          onChange={(d: Date | null) => { update("date", d); setErrors((p) => ({ ...p, date: undefined })); }}
                          showTimeInput
                          timeInputLabel="Time:"
                          dateFormat="dd/MM/yyyy, h:mm aa"
                          placeholderText="Select date and time"
                          ref={datePickerRef}
                          shouldCloseOnSelect={false}
                          customInput={<input className="b2-rj-input" style={{ cursor: 'pointer' }} readOnly />}
                        >
                          <div className="b2-dp-foot">
                            <button type="button" className="b2-btn b2-btn--sm" onClick={() => datePickerRef.current?.setOpen(false)}>Done</button>
                          </div>
                        </DatePicker>
                        <AnimatePresence>{errors.date && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="b2-field__error" role="alert"><AlertCircle size={14} />{errors.date}</motion.p>}</AnimatePresence>
                      </div>
                    </div>
                  </motion.section>
                </div>
              </div>

              {/* submit — tells you what is required, what is missing, and what is happening */}
              <div className="b2-rj-submit">
                <div className="b2-rj-submit__state">
                  <span className="b2-rj-k b2-rj-k--sm"><span className="b2-num">05</span><span>Ready to submit?</span></span>
                  <ul className="b2-rj-check" aria-label="Required fields">
                    {req.map((r) => (
                      <li key={r.k} data-ok={r.ok}>
                        <button type="button" onClick={() => document.getElementById(r.id)?.focus()}>
                          <i aria-hidden="true">{r.ok ? <Check size={11} strokeWidth={3} /> : null}</i>{r.k}<span className="b2-sr">{r.ok ? " — done" : " — missing"}</span>
                        </button>
                      </li>
                    ))}
                    <li data-ok={!!form.image} data-opt="true"><span><i aria-hidden="true">{form.image ? <Check size={11} strokeWidth={3} /> : null}</i>Photo (optional)</span></li>
                  </ul>
                  <p className="b2-rj-help">{c.after}</p>
                  <AnimatePresence>
                    {submitError && (
                      <motion.div className="b2-alert" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <AlertCircle size={18} />
                        <div>
                          <b>{submitError.msg}</b>
                          {submitError.auth && <Link href="/login" className="b2-link" style={{ backgroundSize: '100% 1px', width: 'fit-content' }}>Log in, then submit again</Link>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button type="submit" className="b2-rj-go" disabled={loading} data-ready={ready}>
                  <span className="b2-rj-go__t">
                    <span className="b2-num">{loading ? "Sending" : ready ? "Ready" : `${req.filter((r) => !r.ok).length} required left`}</span>
                    {loading ? "Submitting…" : c.submit}
                  </span>
                  <span className="b2-rj-go__ico">{loading ? <span className="b2-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}</span>
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
