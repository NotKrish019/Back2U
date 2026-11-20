'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Map as MapIcon } from 'lucide-react';
import { api, ReportOut } from '@/services/api';
import { B2Button, Eyebrow, SafeImg, SplitHeading, prettyName, resolveImage, splitLocation } from '@/components/brand/primitives';

const EASE = [0.16, 1, 0.3, 1] as const;
const RATIOS = ["4 / 5", "1 / 1", "4 / 3", "3 / 4", "1 / 1", "5 / 4"];

export default function BrowsePage() {
  const reduce = useReducedMotion();
  const [category, setCategory] = useState("All reports");
  const categories = ["All reports", "Bags", "Tech", "Cards & keys", "Clothing"];

  const [reports, setReports] = useState<ReportOut[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getAllReports()
      .then((data) => {
        // Only show 'found' reports that are still open
        setReports(data.filter(r => r.report_type === 'found' && r.status === 'open'));
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load reports. Please try again later.");
      })
      .finally(() => setDataLoading(false));
  }, []);

  // Simple client side filtering (unchanged)
  const filteredReports = category === "All reports"
    ? reports
    : reports.filter(r => (r.item_category || "").toLowerCase().includes(category.toLowerCase()));

  return (
    <div className="b2-page">
      <header className="b2-container b2-pagehead b2-browse__head">
        <div>
          <Eyebrow>Browse found items</Eyebrow>
          <SplitHeading className="b2-display b2-d1 mt-6">A visual record of <em>what&rsquo;s been found.</em></SplitHeading>
          <p className="b2-lead mt-6">Public-safe previews from across campus. Details stay inside the right flow.</p>
        </div>
        <B2Button href="/map" variant="ghost" icon={<MapIcon size={16} />}>Open map</B2Button>
      </header>

      <div className="b2-container b2-results__bar">
        <p className="b2-num b2-results__count">
          {dataLoading ? "Loading…" : `${filteredReports.length} open found report${filteredReports.length === 1 ? "" : "s"}`}
        </p>
        <div className="b2-seg b2-seg--scroll" role="tablist" aria-label="Filter by category">
          {categories.map((c) => (
            <button key={c} role="tab" aria-selected={category === c} className="b2-seg__b" onClick={() => setCategory(c)}>
              {category === c && <motion.span layoutId="b2-browse-seg" className="b2-seg__pill" transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }} />}
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="b2-container"><div className="b2-alert" role="alert">{error}</div></div>
      )}

      <section className="b2-container">
        {dataLoading ? (
          <div className="b2-masonry" aria-busy="true">
            {RATIOS.map((r, i) => <div key={i} className="b2-skeleton b2-masonry__item" style={{ aspectRatio: r, borderRadius: 10 }} />)}
          </div>
        ) : filteredReports.length === 0 && !error ? (
          <div className="b2-empty">
            <span className="b2-label">No found items</span>
            <h2 className="b2-display b2-d2">Nothing matches right now.</h2>
            <p className="b2-body">We don&rsquo;t have any active found reports matching this filter.</p>
          </div>
        ) : (
          <div className="b2-masonry">
            <AnimatePresence initial={true}>
              {filteredReports.map((item, i) => {
                const { src } = resolveImage(item.image_reference);
                const { place, when } = splitLocation(item.location);
                return (
                  <motion.div
                    key={item.report_id}
                    className="b2-masonry__item"
                    layout={!reduce}
                    initial={{ opacity: 0, y: reduce ? 0 : 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, delay: reduce ? 0 : Math.min(i, 8) * 0.06, ease: EASE }}
                  >
                    <Link href={`/item/${item.report_id}`} className="b2-bcard">
                      <div className="b2-plate b2-bcard__plate" style={{ aspectRatio: RATIOS[i % RATIOS.length] }}>
                        {src
                          ? <SafeImg src={src} alt={prettyName(item.item_category)} loading={i < 4 ? "eager" : "lazy"} />
                          : <span className="b2-noimg">No photo</span>}
                        <span className="b2-tag b2-tag--ink b2-bcard__tag">Found</span>
                      </div>
                      <div className="b2-bcard__copy">
                        <div className="min-w-0">
                          <h3 className="b2-display b2-bcard__name">{prettyName(item.item_category)}</h3>
                          <p className="b2-bcard__meta">{place}{when ? <span className="b2-num"> · {when}</span> : null}</p>
                        </div>
                        <ArrowUpRight size={18} strokeWidth={1.5} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      <section className="b2-container b2-browse__care">
        <span className="b2-label">Browse with care</span>
        <h2 className="b2-display b2-d2">Real reports. <em>Respectful previews.</em></h2>
        <p className="b2-body">Found-item photos are shown here because you&rsquo;re inside the discovery flow. We don&rsquo;t use them as homepage decoration or expose claimant details.</p>
      </section>
    </div>
  );
}
