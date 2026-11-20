"use client";

import { ArrowUpRight } from "lucide-react";
import React, { useRef } from "react";
import { SafeImg, prettyName, resolveImage, splitLocation } from "@/components/brand/primitives";

/** Score threshold for "strong match". Unchanged from the original card (similarity_score > 0.8). */
export const STRONG_MATCH = 0.8;

type Props = {
  item: any;
  primary?: boolean;
  onClick: () => void;
  index?: number;
  feature?: boolean; // large editorial layout for the top result
};

/**
 * A candidate. Data handling is identical to the original card: category name, blurred found-item
 * photos (BLURRED_ prefix), location without its timestamp, and the real similarity_score.
 */
export function ResultCard({ item, primary = false, onClick, index = 0, feature = false }: Props) {
  const plateRef = useRef<HTMLDivElement>(null);
  const name = prettyName(item.item_category);
  const { src: resolved, blurred } = resolveImage(item.image_reference);
  const src = item.image_url || resolved;
  const { place, when } = splitLocation(item.location);
  const score: number | null = typeof item.similarity_score === "number" ? item.similarity_score : null;
  const strong = score !== null && score > STRONG_MATCH;
  const rank: number = item.rank ?? index + 1;

  // Depth hover: a few degrees of pointer-driven tilt on the image plate only (fine pointers).
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !plateRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = plateRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    plateRef.current.style.transform = `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateZ(0)`;
  };
  const onLeave = () => {
    if (plateRef.current) plateRef.current.style.transform = "";
  };

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`b2-result ${feature ? "b2-result--feature" : ""}`}
      aria-label={`${primary ? "Top match" : `Candidate ${rank}`}: ${name}, ${place}${score !== null ? `, similarity ${score.toFixed(2)}` : ""}`}
    >
      <div ref={plateRef} className={`b2-plate b2-result__plate ${blurred ? "b2-plate--blur" : ""}`}>
        {src ? (
          <SafeImg src={src} alt="" loading={index < 2 ? "eager" : "lazy"} />
        ) : (
          <span className="b2-noimg">No photo on file</span>
        )}
        <span className="b2-result__corners" aria-hidden="true">
          <span className="b2-vf__c b2-vf__c--tl" /><span className="b2-vf__c b2-vf__c--tr" />
          <span className="b2-vf__c b2-vf__c--bl" /><span className="b2-vf__c b2-vf__c--br" />
        </span>
        <span className="b2-plate__veil">
          <span>{blurred ? "Photo blurred for privacy" : ""}</span>
          <span className="b2-num">#{String(rank).padStart(2, "0")}</span>
        </span>
      </div>

      <div className="b2-result__body">
        <div className="flex items-center gap-2 flex-wrap">
          {primary && <span className="b2-tag b2-tag--ink">Top match</span>}
          {score !== null && (
            <span className={`b2-tag ${strong ? "b2-tag--signal" : ""}`}>{strong ? "Strong match" : "Possible match"}</span>
          )}
          <span className="b2-tag b2-tag--brass">{(item.report_type || "found").toLowerCase()}</span>
        </div>

        <h3 className="b2-display b2-result__name">{name}</h3>
        {item.description && <p className="b2-result__desc">{item.description}</p>}

        <dl className="b2-result__meta">
          <div><dt className="b2-label">Where</dt><dd>{place}</dd></div>
          {when && <div><dt className="b2-label">When</dt><dd className="b2-num">{when}</dd></div>}
        </dl>

        {score !== null && (
          <div className="b2-score" aria-hidden="true">
            <div className="b2-score__row">
              <span className="b2-label">Similarity score</span>
              <span className="b2-num b2-score__v">{score.toFixed(2)}</span>
            </div>
            <div className="b2-score__track">
              <span className="b2-score__fill" style={{ "--s": Math.max(0, Math.min(1, score)) } as React.CSSProperties} data-strong={strong} />
              <span className="b2-score__mark" style={{ left: `${STRONG_MATCH * 100}%` }} />
            </div>
          </div>
        )}

        <span className="b2-result__go">View details <ArrowUpRight size={16} strokeWidth={1.6} /></span>
      </div>
    </button>
  );
}
