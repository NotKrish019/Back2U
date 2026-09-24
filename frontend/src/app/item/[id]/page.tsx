'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, ZoomIn, ShieldCheck } from 'lucide-react';
import { SectionLabel, Button } from '@/components/ManusUI';

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [open, setOpen] = useState(true);
  
  // mock item since API doesn't have getReport(id) yet
  const item = {
    id: id,
    name: "Sand canvas backpack",
    location: "West Quad · Bench 04",
    date: "Today, 12:40 pm",
    status: "Held at North Hall",
    match: "Strong visual match",
    accent: "coral",
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=85",
    description: "Soft canvas backpack with a wide front pocket, dark straps, and a tiny orange thread detail near the zip.",
  };

  return (
    <div className="page-shell detail-page">
      <div className="detail-back container-wide">
        <button onClick={() => router.push("/search")}><ArrowLeft size={16} />Back to results</button>
        <span>Report {item.id}</span>
      </div>
      <section className="detail-layout container-wide">
        <div className="detail-photo-wrap">
          <img src={item.image} alt={item.name} />
          <div className="photo-controls">
            <button><ZoomIn size={15} />View larger</button>
            <span>Photo shared by campus community</span>
          </div>
        </div>
        <div className="detail-copy">
          <SectionLabel>Possible match</SectionLabel>
          <h1>{item.name}</h1>
          <div className="detail-status">
            <span className="status-pip" />{item.status}<span>·</span>{item.date}
          </div>
          <p className="detail-description">{item.description}</p>
          <div className="detail-meta">
            <div><span>Last reported at</span><b>{item.location}</b></div>
            <div><span>Match signal</span><b>{item.match}</b></div>
          </div>
          <div className="match-explainer">
            <button onClick={() => setOpen(!open)}>
              <span>Why this may be a match</span>
              <ChevronDown className={open ? "rotate" : ""} size={18} />
            </button>
            {open && (
              <div className="explainer-body">
                <p>We noticed a few details that line up with your search:</p>
                <ul>
                  <li><Check size={15} />Similar colour and overall shape</li>
                  <li><Check size={15} />A visible front-pocket detail</li>
                  <li><Check size={15} />Reported in the same part of campus</li>
                </ul>
                <small>These are visual clues, not a confirmed identification.</small>
              </div>
            )}
          </div>
          <div className="detail-actions">
            <Button onClick={() => router.push(`/item/${item.id}/compare`)} variant="solid" icon={<ArrowRight size={17} />}>Compare with my photo</Button>
            <Button onClick={() => router.push("/my-reports")} variant="text" icon={<Heart size={17} />}>Save this match</Button>
          </div>
        </div>
      </section>
      <section className="contact-callout container-wide">
        <div>
          <SectionLabel>Next step</SectionLabel>
          <h2>Could this be<br /><em>your item?</em></h2>
        </div>
        <p>If the comparison feels right, you can mark it as a possible match. We’ll keep your details private while the report owner is contacted.</p>
        <Button onClick={() => router.push(`/item/${item.id}/compare`)} variant="outline" icon={<ArrowUpRight size={16} />}>Open comparison</Button>
      </section>
    </div>
  );
}
