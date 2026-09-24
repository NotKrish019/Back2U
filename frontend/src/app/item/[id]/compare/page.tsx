'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';

export default function ComparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [value, setValue] = useState(52);
  const [choice, setChoice] = useState<"mine" | "not" | null>(null);
  
  return (
    <div className="page-shell compare-page">
      <PageTop 
        eyebrow="Compare" 
        title={<>Could this be<br /><em>yours?</em></>} 
        intro="Drag the line across the photos. Look for the small details that only you would recognise." 
        action={<div className="compare-counter"><span>01</span> / 03 <b>COMPARISON</b></div>} 
      />
      <section className="compare-layout container-wide">
        <div className="compare-stage">
          <img className="compare-image compare-image-back" src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=85" alt="Reported item" />
          <div className="compare-image-front" style={{ width: `${value}%` }}>
            <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=85" alt="Your uploaded photo" />
          </div>
          <div className="compare-divider" style={{ left: `${value}%` }}>
            <span className="compare-handle"><ChevronLeft size={15} /><ChevronRight size={15} /></span>
          </div>
          <span className="compare-label compare-label-left">YOUR PHOTO</span>
          <span className="compare-label compare-label-right">REPORTED ITEM</span>
          <input aria-label="Compare images" type="range" min="5" max="95" value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </div>
        <div className="compare-side">
          <SectionLabel>Things that look similar</SectionLabel>
          <h2>Small details<br /><em>matter.</em></h2>
          <div className="similar-list">
            <div><Check size={16} /><span>Colour</span><b>Canvas / sand</b></div>
            <div><Check size={16} /><span>Shape</span><b>Front pocket</b></div>
            <div><Check size={16} /><span>Feature</span><b>Dark straps</b></div>
            <div><Check size={16} /><span>Detail</span><b>Orange thread</b></div>
          </div>
          <div className="compare-vote">
            {choice ? (
              <div className="vote-thanks">
                <Check size={18} />
                {choice === "mine" ? "We’ve saved this as a possible match." : "Got it — we’ll keep looking."}
              </div>
            ) : (
              <>
                <p>Does this feel like a match?</p>
                <div className="vote-buttons">
                  <Button onClick={() => setChoice("mine")} variant="solid">This might be mine</Button>
                  <Button onClick={() => setChoice("not")} variant="outline">Not my item</Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
      <div className="compare-foot container-wide">
        <button onClick={() => router.push(`/item/${id}`)}><ArrowLeft size={16} />Back to item</button>
        <span><ShieldCheck size={15} />Your photo is only used for this comparison.</span>
      </div>
    </div>
  );
}
