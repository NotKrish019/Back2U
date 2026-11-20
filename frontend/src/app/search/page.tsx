'use client';

import { Suspense, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { AlertCircle, ArrowLeft, ArrowRight, ArrowUpRight, Maximize2, ShieldCheck, X } from 'lucide-react';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ResultCard, STRONG_MATCH } from '@/components/ResultCard';
import { api, RetrievalResult, RetrievalResultItem } from '@/services/api';
import PhotoDrop from '@/components/upload/PhotoDrop';
import { B2Button, Eyebrow, SafeImg, SplitHeading, Viewfinder, prettyName, resolveImage, splitLocation } from '@/components/brand/primitives';

const EASE = [0.16, 1, 0.3, 1] as const;
const QUERY_ID = "b2-query-photo";
type Filter = "All" | "Strong match" | "Possible match";

function Field({ label, error, children, hint }: { label: string; error?: boolean; children: React.ReactNode; hint?: string }) {
  return (
    <div className="b2-field" data-invalid={error ? "true" : undefined}>
      <span className="b2-field__label">
        <span>{label} <span aria-hidden="true" style={{ color: 'var(--b2-signal)' }}>*</span></span>
        {hint && <span className="b2-field__hint">{hint}</span>}
      </span>
      {children}
      {error && <span className="b2-field__error" role="alert"><AlertCircle size={14} />This field is required.</span>}
    </div>
  );
}

/** Real similarity score, drawn — never a made-up percentage. */
function Score({ value, large = false }: { value: number; large?: boolean }) {
  const strong = value > STRONG_MATCH;
  return (
    <div className={`b2-vs__score ${large ? "b2-vs__score--lg" : ""}`}>
      <span className="b2-label">Similarity score</span>
      <span className="b2-num b2-vs__n">{value.toFixed(2)}</span>
      <span className={`b2-tag ${strong ? "b2-tag--signal" : ""}`}>{strong ? "Strong match" : "Possible match"}</span>
    </div>
  );
}

/** Side-by-side inspection of one candidate against the query photo. */
function Inspector({ item, query, onClose, onOpen }: { item: RetrievalResultItem; query: string; onClose: () => void; onOpen: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const { src, blurred } = resolveImage(item.image_reference);
  const { place, when } = splitLocation(item.location);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <motion.div className="b2-insp" role="dialog" aria-modal="true" aria-label={`Compare with ${prettyName(item.item_category)}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <button className="b2-insp__scrim" aria-hidden="true" tabIndex={-1} onClick={onClose} />
      <motion.div className="b2-insp__sheet" initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ duration: 0.5, ease: EASE }}>
        <header className="b2-insp__head">
          <span className="b2-label">Candidate #{String(item.rank).padStart(2, "0")} · side by side</span>
          <button ref={closeRef} className="b2-insp__close" onClick={onClose} aria-label="Close comparison"><X size={18} /></button>
        </header>
        <div className="b2-insp__pair">
          <figure>
            <div className="b2-plate b2-insp__img">
              {query
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={query} alt="Your search photo" />
                : <span className="b2-noimg">Text-only search</span>}
              <Viewfinder size={18} inset={12} color="#fff" />
            </div>
            <figcaption className="b2-label">Your photo</figcaption>
          </figure>
          <figure>
            <motion.div layoutId={`cand-${item.item_instance_id}`} className={`b2-plate b2-insp__img ${blurred ? "b2-plate--blur" : ""}`}>
              {src ? <SafeImg src={src} alt={prettyName(item.item_category)} /> : <span className="b2-noimg">No photo on file</span>}
              <Viewfinder size={18} inset={12} color="#f0617f" />
            </motion.div>
            <figcaption className="b2-label">{blurred ? "Found item · photo blurred for privacy" : "Found item"}</figcaption>
          </figure>
        </div>
        <div className="b2-insp__info">
          <div>
            <h2 className="b2-display b2-d2" style={{ textTransform: 'capitalize' }}>{prettyName(item.item_category)}</h2>
            <dl className="b2-result__meta mt-4">
              <div><dt className="b2-label">Where</dt><dd>{place}</dd></div>
              {when && <div><dt className="b2-label">When</dt><dd className="b2-num">{when}</dd></div>}
              <div><dt className="b2-label">Report</dt><dd style={{ textTransform: 'capitalize' }}>{item.report_type || "found"} · {item.status || "open"}</dd></div>
            </dl>
          </div>
          <Score value={item.similarity_score} large />
          <div className="flex flex-wrap gap-3">
            <B2Button onClick={onOpen} icon={<ArrowUpRight size={17} />}>Open full report</B2Button>
            <B2Button variant="ghost" onClick={onClose}>Back to candidates</B2Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SearchFlowContent() {
  const router = useRouter();
  const reduce = useReducedMotion();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('desc') || '';

  const [view, setView] = useState<'find' | 'searching' | 'results'>(initialQuery ? 'searching' : 'find');
  const [image, setImage] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState(initialQuery);
  const [location, setSearchLocation] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<{name?: boolean, desc?: boolean, loc?: boolean, date?: boolean}>({});
  const datePickerRef = useRef<DatePicker>(null);

  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [searchError, setSearchError] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [elapsed, setElapsed] = useState(0);
  const [inspect, setInspect] = useState<RetrievalResultItem | null>(null);
  // The handed-over photo from Report Lost (if any), so the scanning stage can show what is actually being searched.
  const [handoffImage, setHandoffImage] = useState<string>("");

  // Draft handed over from the home page's "Start a search" panel (photo and/or words). Prefill only.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('back2u:searchDraft');
      if (!raw) return;
      sessionStorage.removeItem('back2u:searchDraft');
      const d = JSON.parse(raw) as { image?: string; desc?: string };
      if (d.image) setImage(d.image);
      if (d.desc && !initialQuery) setDescription(d.desc);
    } catch { /* storage unavailable or malformed */ }
  }, [initialQuery]);

  // A ref (not state) so creating the report can't re-trigger the search effect.
  const reportCreatedRef = useRef(false);

  const handleSearch = () => {
    const newErrors = {
      name: !itemName.trim(),
      desc: !description.trim(),
      loc: !location.trim(),
      date: !date
    };
    setErrors(newErrors);

    if (!newErrors.name && !newErrors.desc && !newErrors.loc && !newErrors.date) {
      setSearchError("");
      setView('searching');
    } else {
      const first = ['name', 'desc', 'loc', 'date'].find((k) => newErrors[k as keyof typeof newErrors]);
      document.getElementById(`f-${first}`)?.focus();
    }
  };

  useEffect(() => {
    if (view !== 'searching') return;
    let cancelled = false;
    const started = performance.now();
    setElapsed(0);
    // Real elapsed time — no simulated percentage.
    const tick = window.setInterval(() => setElapsed((performance.now() - started) / 1000), 100);

    const executeSearchAndReport = async () => {
      try {
        // If the user filled out the form (itemName exists) and we haven't created a report yet
        if (itemName.trim() && !reportCreatedRef.current) {
          reportCreatedRef.current = true;
          const formData = {
            report_type: 'lost' as const,
            item_category: itemName,
            description: description,
            location: `${location} (${date?.toLocaleString()})`,
            image_reference: image || ""
          };
          try {
            await api.createReport(formData);
          } catch (e) {
            reportCreatedRef.current = false;
            throw e;
          }
        }

        // Send the photo when we have one (from this page or handed over by Report Lost);
        // the ML service falls back to text-only search otherwise.
        let queryImage: string | null = image;
        if (!queryImage) {
          try { queryImage = sessionStorage.getItem('back2u:lostQueryImage'); } catch { /* storage unavailable */ }
          if (queryImage && !cancelled) setHandoffImage(queryImage);
        }
        const res = await api.search({
          image: queryImage && queryImage.startsWith('data:image') ? queryImage : undefined,
          text: description.trim() || undefined,
          top_k: 6,
          query_type: 'lost',  // a lost-item search only ever returns open FOUND reports
        });
        if (cancelled) return;
        // Clear the hand-over only once results arrive (dev-mode effects can run twice).
        try { sessionStorage.removeItem('back2u:lostQueryImage'); } catch { /* storage unavailable */ }
        setResult(res);
        setFilter("All");
        setView('results');
      } catch (err: any) {
        if (cancelled) return;
        setSearchError(err?.message || "The search could not be completed.");
        setView('find');
      } finally {
        clearInterval(tick);
      }
    };

    executeSearchAndReport();
    return () => {
      cancelled = true;
      clearInterval(tick);
    };
    // The search reads the form as it is at the moment "searching" begins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [view]);

  // The navigation goes dark over the dark scanning stage and the results face-off.
  useEffect(() => {
    const root = document.documentElement;
    const setTone = (dark: boolean) => { if (dark) root.dataset.navTone = 'dark'; else delete root.dataset.navTone; };
    if (view === 'searching') { setTone(true); return () => setTone(false); }
    if (view !== 'results') { setTone(false); return; }
    let io: IntersectionObserver | null = null;
    const t = window.setTimeout(() => {
      const el = document.querySelector('.b2-vs');
      if (!el) return;
      io = new IntersectionObserver(([e]) => setTone(e.isIntersecting), { rootMargin: '-64px 0px -92% 0px' });
      io.observe(el);
    }, 50);
    return () => { clearTimeout(t); io?.disconnect(); setTone(false); };
  }, [view]);

  const items = useMemo(() => result?.results || [], [result]);
  const top = items[0];
  const rest = useMemo(() => {
    const others = items.slice(1);
    if (filter === "Strong match") return others.filter((i) => i.similarity_score > STRONG_MATCH);
    if (filter === "Possible match") return others.filter((i) => !(i.similarity_score > STRONG_MATCH));
    return others;
  }, [items, filter]);
  const strongCount = items.filter((i) => i.similarity_score > STRONG_MATCH).length;
  const queryPhoto = image || handoffImage;
  const ready = itemName.trim() && description.trim() && location.trim() && date;
  const openReport = useCallback((it: RetrievalResultItem) => router.push(`/item/${it.report_id || it.item_instance_id}`), [router]);
  const topImg = top ? resolveImage(top.image_reference) : null;
  const topLoc = top ? splitLocation(top.location) : null;

  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: reduce ? 0.15 : 0.45 } };

  return (
    <LayoutGroup>
      <div className="b2-views">
        <AnimatePresence initial={false}>
          {view === 'find' && (
            <motion.div key="find" className="b2-page" {...fade}>
              <header className="b2-container b2-pagehead">
                <div className="b2-steps" aria-label="Search progress">
                  <span data-on="true"><b className="b2-num">01</b> Describe</span><i />
                  <span><b className="b2-num">02</b> Search</span><i />
                  <span><b className="b2-num">03</b> Review</span>
                </div>
                <Eyebrow>I lost something</Eyebrow>
                <SplitHeading className="b2-display b2-d1 mt-6">Show us what <em>you remember.</em></SplitHeading>
                <p className="b2-lead mt-6">A photo helps, but it isn&rsquo;t required. Start wherever your memory feels clearest.</p>
              </header>

              {searchError && (
                <div className="b2-container">
                  <div className="b2-alert" role="alert">
                    <AlertCircle size={18} />
                    <div>
                      <b>The search didn&rsquo;t go through.</b>
                      <span className="b2-num">{searchError.slice(0, 240)}</span>
                    </div>
                  </div>
                </div>
              )}

              <section className="b2-container b2-find b2-find--canvas">
                <div className="b2-find__photo">
                  <div className="b2-find__photohead">
                    <span className="b2-label">A · Photo</span>
                    <span className="b2-label" style={{ color: 'var(--b2-mute)' }}>Optional</span>
                  </div>
                  <PhotoDrop value={image} onChange={setImage} tall variant="canvas" layoutId={QUERY_ID} label="Drop your photo here" hint="Drag it in, paste it, or browse your camera roll" />
                  <p className="b2-find__note"><ShieldCheck size={15} />Your photo is only used to search. Found-item photos are blurred until ownership is verified.</p>
                </div>

                <form className="b2-find__form" onSubmit={(e) => { e.preventDefault(); handleSearch(); }} noValidate>
                  <span className="b2-label">B · Details</span>
                  <Field label="Item name" error={errors.name}>
                    <input id="f-name" className="b2-input" type="text" value={itemName}
                      onChange={(e) => { setItemName(e.target.value); if (errors.name) setErrors(p => ({ ...p, name: false })); }}
                      placeholder="e.g. Blue Chillys bottle" autoComplete="off" />
                  </Field>
                  <Field label="Describe the item" error={errors.desc} hint="Used for text matching">
                    <textarea id="f-desc" value={description}
                      onChange={(e) => { setDescription(e.target.value); if (errors.desc) setErrors(p => ({ ...p, desc: false })); }}
                      placeholder="Colour, shape, a sticker, a scuff — anything that stands out…" />
                  </Field>
                  <div className="b2-find__pair">
                    <Field label="Where did you last see it?" error={errors.loc}>
                      <input id="f-loc" className="b2-input" type="text" value={location}
                        onChange={(e) => { setSearchLocation(e.target.value); if (errors.loc) setErrors(p => ({ ...p, loc: false })); }}
                        placeholder="e.g. Library, 2nd floor" />
                    </Field>
                    <Field label="When was it?" error={errors.date}>
                      <DatePicker
                        selected={date}
                        onChange={(d: Date | null) => { setDate(d); if (errors.date) setErrors(p => ({ ...p, date: false })); }}
                        showTimeInput
                        timeInputLabel="Time:"
                        dateFormat="dd/MM/yyyy, h:mm aa"
                        placeholderText="Select date and time"
                        ref={datePickerRef}
                        shouldCloseOnSelect={false}
                        id="f-date"
                        customInput={<input className="b2-input" style={{ cursor: 'pointer' }} readOnly />}
                      >
                        <div className="b2-dp-foot">
                          <button type="button" className="b2-btn b2-btn--sm" onClick={() => datePickerRef.current?.setOpen(false)}>Done</button>
                        </div>
                      </DatePicker>
                    </Field>
                  </div>
                  <div className="b2-find__submit">
                    <span className="b2-label" data-ready={!!ready} aria-live="polite">
                      {ready ? "Ready to look" : "All four details are needed"}
                    </span>
                    <B2Button type="submit" size="lg" icon={<ArrowRight size={18} />}>Find my item</B2Button>
                  </div>
                </form>
              </section>
            </motion.div>
          )}

          {view === 'searching' && (
            <motion.div key="searching" className="b2-scan" {...fade} role="status" aria-live="polite">
              <div className="b2-container b2-scan__grid">
                <div className="b2-scan__frame" data-photo={!!queryPhoto}>
                  {queryPhoto ? (
                    <motion.img layoutId={QUERY_ID} src={queryPhoto} alt="The photo being searched" transition={{ duration: 0.9, ease: EASE }} />
                  ) : (
                    <p className="b2-display b2-scan__words">&ldquo;{description || itemName}&rdquo;</p>
                  )}
                  <span className="b2-scan__line" aria-hidden="true" />
                  <span className="b2-scan__grid-ov" aria-hidden="true" />
                  <Viewfinder size={26} inset={18} color="var(--b2-signal)" className="b2-scan__vf" />
                </div>

                <div className="b2-scan__copy">
                  <span className="b2-label" style={{ color: 'var(--b2-aluminium)' }}>
                    <span className="b2-scan__live" aria-hidden="true" />Searching — waiting for the server
                  </span>
                  <h1 className="b2-display b2-d1 mt-6">Looking through <em>found reports…</em></h1>
                  <p className="b2-scan__p">
                    {queryPhoto && description.trim() ? "Your photo and description are" : queryPhoto ? "Your photo is" : "Your description is"} being compared with every found item on campus. This screen stays until the real results come back.
                  </p>
                  <ol className="b2-scan__pipe" aria-label="What the server is running">
                    {["Detect & crop", "Category gate", "Embed", "Vector search", "Rerank"].map((s) => <li key={s}>{s}</li>)}
                  </ol>
                  <dl className="b2-scan__facts">
                    <div><dt>Query</dt><dd>{queryPhoto && description.trim() ? "Photo + text" : queryPhoto ? "Photo" : "Text"}</dd></div>
                    <div><dt>Elapsed</dt><dd className="b2-num">{elapsed.toFixed(1)}s</dd></div>
                    <div><dt>Results requested</dt><dd className="b2-num">6</dd></div>
                  </dl>
                  <button className="b2-scan__cancel" onClick={() => setView('find')}>
                    <ArrowLeft size={15} /> Cancel and edit search
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div key="results" className="b2-page b2-page--results" {...fade}>
              {/* ── The face-off: your photo vs the top candidate */}
              <section className="b2-vs">
                <div className="b2-container">
                  <div className="b2-vs__top">
                    <div className="b2-steps b2-steps--dark" aria-label="Search progress">
                      <span><b className="b2-num">01</b> Describe</span><i />
                      <span><b className="b2-num">02</b> Search</span><i />
                      <span data-on="true"><b className="b2-num">03</b> Review</span>
                    </div>
                    <button className="b2-vs__edit" onClick={() => setView('find')}><ArrowLeft size={15} /> Edit search</button>
                  </div>
                  <h1 className="b2-display b2-vs__title">
                    {items.length > 0 ? <>A few things <em>look familiar.</em></> : <>Nothing yet. <em>We&rsquo;ll keep looking.</em></>}
                  </h1>

                  <div className="b2-vs__stage" data-has-top={!!top}>
                    <figure className="b2-vs__side">
                      <div className="b2-plate b2-vs__img">
                        {queryPhoto
                          ? <motion.img layoutId={QUERY_ID} src={queryPhoto} alt="Your search photo" transition={{ duration: 0.9, ease: EASE }} />
                          : <p className="b2-display b2-vs__words">&ldquo;{description || itemName}&rdquo;</p>}
                        <Viewfinder size={20} inset={14} color="rgba(255,255,255,.9)" />
                      </div>
                      <figcaption><span className="b2-label">Your search</span><b>{itemName || description || "—"}</b>{location && <span>{location}</span>}</figcaption>
                    </figure>

                    {top && (
                      <>
                        <motion.div className="b2-vs__mid" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 0.55, duration: 0.7, ease: EASE }}>
                          <span className="b2-vs__line" aria-hidden="true" />
                          <Score value={top.similarity_score} large />
                          <span className="b2-vs__line" aria-hidden="true" />
                        </motion.div>
                        <motion.figure className="b2-vs__side" initial={{ opacity: 0, x: reduce ? 0 : 60 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduce ? 0 : 0.35, duration: 0.9, ease: EASE }}>
                          <button className={`b2-plate b2-vs__img b2-vs__img--btn ${topImg?.blurred ? "b2-plate--blur" : ""}`} onClick={() => setInspect(top)} aria-label={`Compare side by side with ${prettyName(top.item_category)}`}>
                            <motion.span layoutId={`cand-${top.item_instance_id}`} className="absolute inset-0">
                              {topImg?.src ? <SafeImg src={topImg.src} alt="" /> : <span className="b2-noimg">No photo on file</span>}
                            </motion.span>
                            <Viewfinder size={20} inset={14} color="#f0617f" />
                            <span className="b2-vs__inspect"><Maximize2 size={13} /> Compare</span>
                          </button>
                          <figcaption>
                            <span className="b2-label">Top candidate · #01{topImg?.blurred ? " · blurred for privacy" : ""}</span>
                            <b style={{ textTransform: 'capitalize' }}>{prettyName(top.item_category)}</b>
                            <span>{topLoc?.place}{topLoc?.when ? ` · ${topLoc.when}` : ""}</span>
                          </figcaption>
                        </motion.figure>
                      </>
                    )}
                  </div>
                  {top && (
                    <div className="b2-vs__actions">
                      <B2Button variant="light" onClick={() => openReport(top)} icon={<ArrowUpRight size={17} />}>Open top candidate</B2Button>
                      <span className="b2-num b2-vs__meta">{items.length} candidate{items.length === 1 ? "" : "s"} · {strongCount} strong{result?.model_version ? ` · model ${result.model_version}` : ""}</span>
                    </div>
                  )}
                </div>
              </section>

              {items.length === 0 ? (
                <section className="b2-container">
                  <div className="b2-empty">
                    {result?.status === 'UNSUPPORTED_ITEM' ? (
                      <>
                        <span className="b2-label">Photo not recognised</span>
                        <h2 className="b2-display b2-d2">We can&rsquo;t match this kind of item yet.</h2>
                        <p className="b2-body">{result.message || "Back2U currently matches laptops, phones, wallets, earphones, headphones, keys and books."} Your lost report is saved, and staff can still help you find it.</p>
                      </>
                    ) : (
                      <>
                        <span className="b2-label">No matches yet</span>
                        <h2 className="b2-display b2-d2">Your item hasn&rsquo;t been reported found yet.</h2>
                        <p className="b2-body">Your lost report is saved. When someone files a found report that matches it, it will appear under My reports.</p>
                      </>
                    )}
                    <div className="flex flex-wrap gap-3 mt-4">
                      <B2Button href="/reports">Go to my reports</B2Button>
                      <B2Button variant="ghost" onClick={() => setView('find')}>Edit search</B2Button>
                    </div>
                  </div>
                </section>
              ) : items.length > 1 && (
                <>
                  <div className="b2-container b2-results__bar">
                    <p className="b2-display b2-results__h">Other candidates</p>
                    <div className="b2-seg" role="tablist" aria-label="Filter candidates">
                      {(["All", "Strong match", "Possible match"] as Filter[]).map((f) => (
                        <button key={f} role="tab" aria-selected={filter === f} className="b2-seg__b" onClick={() => setFilter(f)}>
                          {filter === f && <motion.span layoutId="b2-seg" className="b2-seg__pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} />}
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <section className="b2-container b2-results">
                    {rest.length === 0 ? (
                      <div className="b2-empty">
                        <h2 className="b2-display b2-d3">No other candidates in &ldquo;{filter}&rdquo;.</h2>
                        <B2Button variant="ghost" size="sm" onClick={() => setFilter("All")}>Show all</B2Button>
                      </div>
                    ) : (
                      <ol className="b2-results__list b2-results__list--stagger">
                        <AnimatePresence>
                          {rest.map((item, i) => (
                            <motion.li
                              key={item.item_instance_id}
                              layout={!reduce}
                              initial={{ opacity: 0, y: reduce ? 0 : 40 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true, margin: "-10%" }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.8, delay: reduce ? 0 : (i % 2) * 0.08, ease: EASE }}
                            >
                              <motion.div layoutId={`cand-wrap-${item.item_instance_id}`}>
                                <ResultCard item={item} index={i + 1} onClick={() => setInspect(item)} />
                              </motion.div>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                      </ol>
                    )}
                  </section>
                </>
              )}

              <div className="b2-container b2-results__foot">
                <ShieldCheck size={16} />
                <span>Match language is a helpful signal, not a guarantee. Always check the details before making contact.</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {inspect && (
          <Inspector
            key={inspect.item_instance_id}
            item={inspect}
            query={queryPhoto}
            onClose={() => setInspect(null)}
            onOpen={() => openReport(inspect)}
          />
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default function SearchFlowPage() {
  return (
    <Suspense fallback={<div className="b2-page b2-container pt-24"><span className="b2-label">Loading…</span></div>}>
      <SearchFlowContent />
    </Suspense>
  );
}
