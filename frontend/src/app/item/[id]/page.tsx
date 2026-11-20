'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Maximize2, X } from 'lucide-react';
import { api, ReportOut } from '@/services/api';
import { B2Button, Eyebrow, SafeImg, Viewfinder, prettyName, resolveImage, splitLocation } from '@/components/brand/primitives';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Full-screen inspection view: click/tap to zoom 2.2×, pointer pans the zoomed image. */
function Inspector({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);
  return (
    <motion.div
      className="b2-inspect" role="dialog" aria-modal="true" aria-label="Inspect photo"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
    >
      <button ref={closeRef} className="b2-inspect__close" onClick={onClose} aria-label="Close"><X size={20} /></button>
      <div
        className="b2-inspect__stage"
        data-zoom={zoom}
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
          setZoom((z) => !z);
        }}
        onPointerMove={(e) => {
          if (!zoom || e.pointerType !== 'mouse') return;
          const r = e.currentTarget.getBoundingClientRect();
          setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ transformOrigin: origin }} />
      </div>
      <span className="b2-label b2-inspect__hint">{zoom ? "Click to zoom out" : "Click to zoom in"} · Esc to close</span>
    </motion.div>
  );
}

export default function DetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const reduce = useReducedMotion();
  const [inspect, setInspect] = useState(false);

  const [item, setItem] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getReport(id)
      .then(res => setItem(res))
      .catch(err => {
        console.error(err);
        setError("Failed to load report. It may have been deleted or you don't have access.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/search'));

  if (loading) {
    return (
      <div className="b2-page">
        <div className="b2-container b2-detail" aria-busy="true">
          <div className="b2-plate b2-skeleton" style={{ aspectRatio: '4 / 5' }} />
          <div className="grid gap-4 content-start pt-6">
            <div className="b2-skeleton" style={{ height: 14, width: 120 }} />
            <div className="b2-skeleton" style={{ height: 56, width: '70%' }} />
            <div className="b2-skeleton" style={{ height: 14, width: '90%' }} />
            <div className="b2-skeleton" style={{ height: 14, width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="b2-page">
        <div className="b2-container b2-empty" style={{ paddingTop: 96 }}>
          <span className="b2-label">Report not found</span>
          <h1 className="b2-display b2-d2">We couldn&rsquo;t open this report.</h1>
          <p className="b2-body">{error}</p>
          <B2Button onClick={() => router.push("/browse")}>Browse public reports</B2Button>
        </div>
      </div>
    );
  }

  const { src: imageUrl } = resolveImage(item.image_reference);
  const isResolved = item.status === 'resolved';
  const badge = isResolved ? 'Resolved' : (item.report_type === 'lost' ? 'Searching' : 'Held');
  const { place, when } = splitLocation(item.location);
  const name = prettyName(item.item_category);

  return (
    <div className="b2-page">
      <div className="b2-container pt-8 md:pt-12">
        <button onClick={goBack} className="b2-back"><ArrowLeft size={16} /> Back</button>
      </div>

      <article className="b2-container b2-detail">
        <motion.div
          className="b2-detail__media"
          initial={{ opacity: 0, scale: reduce ? 1 : 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          {imageUrl ? (
            <button className="b2-plate b2-detail__plate" onClick={() => setInspect(true)} aria-label={`Inspect photo of ${name}`}>
              <SafeImg src={imageUrl} alt={name} />
              <Viewfinder size={22} inset={16} color="#fff" />
              <span className="b2-detail__zoom"><Maximize2 size={14} /> Inspect</span>
            </button>
          ) : (
            <div className="b2-plate b2-detail__plate"><span className="b2-noimg">No photo on file</span></div>
          )}
        </motion.div>

        <motion.div
          className="b2-detail__info"
          initial={{ opacity: 0, y: reduce ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: reduce ? 0 : 0.12, ease: EASE }}
        >
          <div className="flex gap-2 flex-wrap">
            <span className="b2-tag b2-tag--brass">{item.report_type} report</span>
            <span className={`b2-tag ${isResolved ? 'b2-tag--ok' : item.report_type === 'lost' ? 'b2-tag--signal' : 'b2-tag--ink'}`}>{badge}</span>
          </div>

          <h1 className="b2-display b2-d1 b2-detail__title">{name}</h1>
          <p className="b2-lead">{item.description || "No description provided."}</p>

          <dl className="b2-spec">
            <div><dt className="b2-label">Location</dt><dd>{place}</dd></div>
            {when && <div><dt className="b2-label">Seen</dt><dd className="b2-num">{when}</dd></div>}
            <div><dt className="b2-label">Reported</dt><dd className="b2-num">{new Date(item.created_at).toLocaleString()}</dd></div>
            <div><dt className="b2-label">Status</dt><dd style={{ textTransform: 'capitalize' }}>{item.status}</dd></div>
            <div><dt className="b2-label">Reference</dt><dd className="b2-num">{item.report_id}</dd></div>
          </dl>

          <div className="b2-detail__actions">
            <B2Button size="lg" onClick={() => router.push(`/item/${item.report_id}/compare`)} icon={<ArrowRight size={18} />}>
              Compare with my item
            </B2Button>
            <B2Button size="lg" variant="ghost" href="/reports">My reports</B2Button>
          </div>
          <p className="b2-detail__fine">Comparing lets you check the photo side by side and start a claim. Staff verify ownership before anything is returned.</p>
        </motion.div>
      </article>

      <AnimatePresence>
        {inspect && imageUrl && <Inspector src={imageUrl} alt={name} onClose={() => setInspect(false)} />}
      </AnimatePresence>
    </div>
  );
}
