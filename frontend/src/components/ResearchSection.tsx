"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

/* Content is unchanged from the previous research section — presentation only. */
const PAPERS = [
  {
    area: "Visual representation",
    title: "DINOv2",
    line: "Robust visual features, learned without labels.",
    body: "General-purpose visual representations that hold up across different images and conditions — the foundation for comparing lost and found item photographs.",
    ref: "Oquab et al. · 2023",
    url: "https://arxiv.org/abs/2304.07193",
  },
  {
    area: "Object-centric data",
    title: "Objectron",
    line: "Learning from multiple views of one object.",
    body: "Object-centric video with pose annotations and multiple views: how the same physical object can look different across photographs.",
    ref: "Ahmadyan et al. · CVPR 2021",
    url: "https://openaccess.thecvf.com/content/CVPR2021/html/Ahmadyan_Objectron_A_Large_Scale_Dataset_of_Object-Centric_Videos_in_the_CVPR_2021_paper.html",
  },
  {
    area: "Object discovery",
    title: "Grounding DINO",
    line: "Finding objects from visual and textual cues.",
    body: "Open-set detection that combines vision and language, so objects can be located by name rather than from a fixed list of classes.",
    ref: "Liu et al. · 2023",
    url: "https://arxiv.org/abs/2303.05499",
  },
  {
    area: "Fine-grained matching",
    title: "Supervised contrastive learning",
    line: "Pull the same instance together, push different ones apart.",
    body: "Uses label information to organise the embedding space so that photos of one object sit close and photos of look-alikes are separated.",
    ref: "Khosla et al. · NeurIPS 2020",
    url: "https://papers.neurips.cc/paper_files/paper/2020/hash/d89a66c7c80a29b1bdbab0f2a1a94af8-Abstract.html",
  },
  {
    area: "Image + text",
    title: "SigLIP 2",
    line: "Connecting what people see with what they describe.",
    body: "Vision-language representations with strong image-text retrieval — what lets a vague description score against a photo.",
    ref: "Tschannen et al. · 2025",
    url: "https://arxiv.org/abs/2502.14786",
  },
  {
    area: "Unknown objects",
    title: "Open-set recognition",
    line: "Knowing when a match should not be trusted.",
    body: "Systems meet objects they were never trained on. Back2U should refuse those, not force them into the nearest category.",
    ref: "Bendale & Boult · CVPR 2016",
    url: "https://openaccess.thecvf.com/content_cvpr_2016/html/Bendale_Towards_Open_Set_CVPR_2016_paper.html",
  },
];

/* ---------------------------------------------------------------- conceptual plates (illustrations, not results) */

/** A camera drawn as an outline, used across plates so the atlas has one recurring subject. */
const CameraGlyph = ({ x = 0, y = 0, s = 1, cls = "" }: { x?: number; y?: number; s?: number; cls?: string }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} className={cls}>
    <rect x="-60" y="-34" width="120" height="70" rx="9" />
    <rect x="-46" y="-46" width="30" height="14" rx="3" />
    <circle cx="8" cy="2" r="24" />
    <circle cx="8" cy="2" r="14" />
    <circle cx="44" cy="-20" r="4" />
  </g>
);

function PlateFeatures() {
  // the same object in three views; matching feature points are linked across views
  const pts = [[-30, -18], [8, 2], [30, -22], [-40, 20], [26, 22], [-10, -30]];
  const views = [{ x: 90, y: 150, s: 0.95, r: -8 }, { x: 260, y: 120, s: 1.15, r: 4 }, { x: 420, y: 165, s: 0.85, r: 14 }];
  return (
    <svg viewBox="0 0 520 300" className="b2-plate-svg" aria-hidden="true">
      {views.map((v, i) => (
        <g key={i} transform={`translate(${v.x} ${v.y}) rotate(${v.r}) scale(${v.s})`}>
          <CameraGlyph cls="b2-pl-obj" />
          {pts.map(([px, py], k) => <circle key={k} cx={px} cy={py} r="3.2" className="b2-pl-pt" style={{ animationDelay: `${k * 90 + i * 40}ms` }} />)}
        </g>
      ))}
      {pts.slice(0, 4).map(([px, py], k) => {
        const a = views[0], b = views[1], c = views[2];
        const tf = (v: typeof a) => { const r = (v.r * Math.PI) / 180; return [v.x + (px * Math.cos(r) - py * Math.sin(r)) * v.s, v.y + (px * Math.sin(r) + py * Math.cos(r)) * v.s]; };
        const [x1, y1] = tf(a), [x2, y2] = tf(b), [x3, y3] = tf(c);
        return <polyline key={k} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} className="b2-pl-link" style={{ animationDelay: `${500 + k * 120}ms` }} />;
      })}
      <text x="20" y="282" className="b2-pl-cap">same features, three photographs</text>
    </svg>
  );
}

function PlateViews() {
  // one object at the centre, camera positions around it; the wireframe box turns in 3D (CSS)
  return (
    <div className="b2-pl-views" aria-hidden="true">
      <svg viewBox="0 0 520 300" className="b2-plate-svg">
        <ellipse cx="260" cy="170" rx="210" ry="70" className="b2-pl-orbit" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => {
          const a = (k / 8) * Math.PI * 2 + 0.3, x = 260 + Math.cos(a) * 210, y = 170 + Math.sin(a) * 70;
          return (
            <g key={k} transform={`translate(${x} ${y})`} className="b2-pl-cam" style={{ animationDelay: `${k * 110}ms` }}>
              <rect x="-9" y="-6" width="18" height="12" rx="2" />
              <line x1="0" y1="0" x2={(260 - x) * 0.18} y2={(150 - y) * 0.18} />
            </g>
          );
        })}
        <text x="20" y="282" className="b2-pl-cap">camera positions around one object</text>
      </svg>
      <div className="b2-pl-cube"><i /><i /><i /><i /><i /><i /></div>
    </div>
  );
}

function PlateDetect() {
  const objs = [
    { k: "keys", x: 60, y: 110, w: 110, h: 90, d: "M85 150 a22 22 0 1 1 44 0 a22 22 0 1 1 -44 0 M129 150 h28 v10 h-6 v-6 h-6 v8 h-6 v-8 h-10z" },
    { k: "water bottle", x: 205, y: 70, w: 80, h: 165, d: "M232 90 h26 v14 l8 12 v100 a8 8 0 0 1 -8 8 h-26 a8 8 0 0 1 -8 -8 v-100 l8 -12z" },
    { k: "headphones", x: 320, y: 95, w: 150, h: 120, d: "M345 180 v-30 a50 50 0 0 1 100 0 v30 M335 165 h22 v40 h-22z M433 165 h22 v40 h-22z" },
  ];
  return (
    <svg viewBox="0 0 520 300" className="b2-plate-svg b2-pl-detect" aria-hidden="true">
      {objs.map((o) => <path key={o.k} d={o.d} className="b2-pl-obj" />)}
      {objs.map((o, i) => (
        <g key={o.k + "b"} className={`b2-pl-box ${i === 0 ? "b2-pl-box--hit" : ""}`} style={{ animationDelay: `${300 + i * 260}ms` }}>
          <rect x={o.x} y={o.y} width={o.w} height={o.h} />
          <rect x={o.x} y={o.y - 18} width={o.k.length * 7 + 14} height="16" className="b2-pl-tagbg" />
          <text x={o.x + 7} y={o.y - 6} className="b2-pl-tag">{o.k}</text>
        </g>
      ))}
      <g className="b2-pl-prompt">
        <rect x="20" y="20" width="150" height="28" rx="14" />
        <text x="36" y="38">prompt: “keys”</text>
      </g>
      <text x="20" y="282" className="b2-pl-cap">located by name, not a fixed class list</text>
    </svg>
  );
}

function PlateEmbed() {
  // deterministic pseudo-random points: same-instance (pink) gather, look-alikes (ink) move apart
  const rnd = (i: number) => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s); };
  const same = Array.from({ length: 9 }, (_, i) => ({ sx: 40 + rnd(i) * 440, sy: 30 + rnd(i + 50) * 220, ex: 250 + (rnd(i + 9) - 0.5) * 56, ey: 145 + (rnd(i + 19) - 0.5) * 50 }));
  const look = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2, r = 105 + rnd(i + 70) * 40;
    return { sx: 40 + rnd(i + 30) * 440, sy: 30 + rnd(i + 90) * 220, ex: 250 + Math.cos(a) * r * 1.5, ey: 145 + Math.sin(a) * r * 0.75 };
  });
  return (
    <svg viewBox="0 0 520 300" className="b2-plate-svg b2-pl-embed" aria-hidden="true">
      <circle cx="250" cy="145" r="44" className="b2-pl-halo" />
      {look.map((p, i) => <circle key={"l" + i} r="5" className="b2-pl-dot b2-pl-dot--other" style={{ "--sx": `${p.sx}px`, "--sy": `${p.sy}px`, "--ex": `${p.ex}px`, "--ey": `${p.ey}px` } as React.CSSProperties} />)}
      {same.map((p, i) => <circle key={"s" + i} r="5.5" className="b2-pl-dot b2-pl-dot--same" style={{ "--sx": `${p.sx}px`, "--sy": `${p.sy}px`, "--ex": `${p.ex}px`, "--ey": `${p.ey}px` } as React.CSSProperties} />)}
      <g className="b2-pl-legend"><circle cx="28" cy="262" r="5" className="b2-pl-dot--same" /><text x="40" y="266">one object</text><circle cx="128" cy="262" r="5" className="b2-pl-dot--other" /><text x="140" y="266">look-alikes</text></g>
      <text x="20" y="290" className="b2-pl-cap">conceptual sketch — not a measured plot</text>
    </svg>
  );
}

function PlateText() {
  const words = ["black", "film", "camera,", "pink", "tag"];
  return (
    <svg viewBox="0 0 520 300" className="b2-plate-svg b2-pl-text" aria-hidden="true">
      <rect x="30" y="50" width="170" height="130" rx="8" className="b2-pl-frame" />
      <CameraGlyph x={115} y={118} s={0.95} cls="b2-pl-obj" />
      <path d="M150 140 l16 6 l-4 18 l-16 -6z" className="b2-pl-pinktag" />
      <g transform="translate(320 70)">
        {words.map((w, i) => {
          const row = i < 3 ? 0 : 1, before = (row ? words.slice(3, i) : words.slice(0, i)).reduce((t, x) => t + x.length * 8 + 26, 0);
          return (
            <g key={w} className="b2-pl-word" style={{ animationDelay: `${200 + i * 140}ms` }}>
              <rect x={before} y={row * 40} width={w.length * 8 + 18} height="28" rx="14" />
              <text x={before + 9} y={row * 40 + 19}>{w}</text>
            </g>
          );
        })}
      </g>
      <path d="M205 115 C 250 115, 270 110, 315 95" className="b2-pl-bridge" />
      <path d="M205 135 C 250 140, 270 140, 315 135" className="b2-pl-bridge" style={{ animationDelay: "250ms" }} />
      <text x="20" y="282" className="b2-pl-cap">a photo and a description, compared directly</text>
    </svg>
  );
}

function PlateGate() {
  return (
    <svg viewBox="0 0 520 300" className="b2-plate-svg b2-pl-gate" aria-hidden="true">
      <line x1="300" y1="40" x2="300" y2="250" className="b2-pl-wall" />
      {[["camera", 80], ["wallet", 145]].map(([k, y]) => (
        <g key={k as string} className="b2-pl-known" style={{ "--y": `${y}px` } as React.CSSProperties}>
          <rect x="0" y="-16" width="96" height="32" rx="4" />
          <text x="12" y="5">{k}</text>
        </g>
      ))}
      <g className="b2-pl-unknown">
        <path d="M0 -18 l22 10 l-6 24 l-26 2 l-8 -22z" />
        <text x="-20" y="38">unknown</text>
      </g>
      <g className="b2-pl-refuse"><circle cx="300" cy="215" r="14" /><path d="M293 208 l14 14 M307 208 l-14 14" /></g>
      <text x="320" y="36" className="b2-pl-slot">known categories →</text>
      <text x="20" y="282" className="b2-pl-cap">refuse rather than guess</text>
    </svg>
  );
}

const PLATES = [PlateFeatures, PlateViews, PlateDetect, PlateEmbed, PlateText, PlateGate];

/* ---------------------------------------------------------------- section */
export default function ResearchSection() {
  const listRef = useRef<HTMLOListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[data-plate]") ?? []);
    const reveal = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) (e.target as HTMLElement).dataset.in = "true"; }), { threshold: 0.25 });
    const spy = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.plate)); }), { rootMargin: "-45% 0px -50% 0px" });
    items.forEach((el) => { reveal.observe(el); spy.observe(el); });
    return () => { reveal.disconnect(); spy.disconnect(); };
  }, []);

  return (
    <section className="b2-atlas" aria-labelledby="research-title">
      <div className="b2-container">
        <header className="b2-atlas__head">
          <span className="b2-label b2-label--dot">05 — Foundations</span>
          <h2 id="research-title" className="b2-atlas__title">
            Research that helps Back2U <em>see, match and reconnect.</em>
          </h2>
          <p className="b2-atlas__intro">
            Back2U builds on established work in computer vision, representation learning, multimodal retrieval and
            open-set recognition — to move beyond keyword-based lost &amp; found.
          </p>
        </header>

        <div className="b2-atlas__body">
          {/* atlas index */}
          <nav className="b2-atlas__index" aria-label="Research foundations">
            <span className="b2-num b2-atlas__index-k">Atlas · {String(PAPERS.length).padStart(2, "0")} plates</span>
            <ol>
              {PAPERS.map((p, i) => (
                <li key={p.title}>
                  <a href={`#atlas-${i + 1}`} data-on={active === i} aria-current={active === i ? "true" : undefined}>
                    <span className="b2-num">{String(i + 1).padStart(2, "0")}</span>{p.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* plates */}
          <ol ref={listRef} className="b2-atlas__plates">
            {PAPERS.map((p, i) => {
              const Plate = PLATES[i];
              return (
                <li key={p.title} id={`atlas-${i + 1}`} data-plate={i} data-in="false" className="b2-atlas-plate" data-side={i % 2 ? "r" : "l"}>
                  <figure className="b2-atlas-plate__fig">
                    <Plate />
                    <figcaption className="b2-num">Plate {String(i + 1).padStart(2, "0")} · {p.area} · illustration</figcaption>
                  </figure>
                  <div className="b2-atlas-plate__text">
                    <span className="b2-atlas-plate__n b2-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                    <span className="b2-label b2-atlas-plate__area">{p.area}</span>
                    <h3 className="b2-atlas-plate__title">{p.title}</h3>
                    <p className="b2-atlas-plate__line">{p.line}</p>
                    <p className="b2-atlas-plate__body">{p.body}</p>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="b2-atlas-plate__ref" aria-label={`${p.title} — ${p.ref} (opens in a new tab)`}>
                      <span className="b2-num">{p.ref}</span>
                      <span className="b2-atlas-plate__ico"><ArrowUpRight size={15} strokeWidth={1.6} /></span>
                    </a>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
