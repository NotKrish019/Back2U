'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '../../../report/lost/ManusUILab';
import { api, ReportOut } from '@/services/api';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import '../../../report/lost/report.css';

export default function ComparePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [value, setValue] = useState(52);
  const [choice, setChoice] = useState<"mine" | "not" | "claiming" | null>(null);
  const [proofText, setProofText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [item, setItem] = useState<ReportOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getReport(id)
      .then(res => setItem(res))
      .catch(err => setError("Failed to load report."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading comparison...</div>;
  }

  if (error || !item) {
    return (
      <div className="page-shell compare-page" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2>Report not found</h2>
        <p>{error}</p>
        <div style={{ marginTop: '2rem' }}>
          <Button onClick={() => router.push(`/item/${id}`)} variant="solid">Back to report</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell compare-page">
      <GlobalMeshBackground />
      <PageTop 
        eyebrow="Compare" 
        title={<>Could this be<br /><em>yours?</em></>} 
        intro="Drag the line across the photos. Look for the small details that only you would recognise." 
        action={<div className="compare-counter"><span>01</span> / 01 <b>COMPARISON</b></div>} 
      />
      <section className="compare-layout container-wide">
        <div className="compare-stage">
          {item.image_reference ? (
            <>
              <img className="compare-image compare-image-back" src={item.image_reference} alt="Reported item" />
              <div className="compare-image-front" style={{ width: `${value}%` }}>
                <img src={item.image_reference} alt="Your uploaded photo (Pending ML)" />
              </div>
            </>
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No image available for comparison
            </div>
          )}
          <div className="compare-divider" style={{ left: `${value}%` }}>
            <span className="compare-handle"><ChevronLeft size={15} /><ChevronRight size={15} /></span>
          </div>
          <span className="compare-label compare-label-left">YOUR PHOTO</span>
          <span className="compare-label compare-label-right">REPORTED ITEM</span>
          <input aria-label="Compare images" type="range" min="5" max="95" value={value} onChange={(e) => setValue(Number(e.target.value))} />
        </div>
        <div className="compare-side">
          <SectionLabel>Compare Details</SectionLabel>
          <h2>Small details<br /><em>matter.</em></h2>
          <div className="similar-list" style={{ marginTop: '1rem', opacity: 0.8 }}>
             <p>{item.description || "No description provided."}</p>
          </div>
          <div className="compare-vote" style={{ marginTop: '2rem' }}>
            {choice === "mine" ? (
              <div className="vote-thanks" style={{ background: 'rgba(233,109,89,.13)', color: 'var(--coral-dark)', padding: '13px' }}>
                <Check size={18} />
                Your claim has been submitted to the admin for review!
              </div>
            ) : choice === "not" ? (
              <div className="vote-thanks" style={{ background: 'rgba(233,109,89,.13)', color: 'var(--coral-dark)', padding: '13px' }}>
                <Check size={18} />
                Got it — we’ll keep looking.
              </div>
            ) : choice === "claiming" ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '14px', fontWeight: 'bold' }}>Provide Proof of Ownership</p>
                <textarea 
                  value={proofText}
                  onChange={e => setProofText(e.target.value)}
                  placeholder="Describe unique scratches, a serial number, or password..."
                  style={{ width: '100%', minHeight: '100px', padding: '12px', background: 'transparent', border: '1px solid var(--line)', outline: 'none' }}
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                  <Button 
                    variant="solid" 
                    onClick={async () => {
                      setIsSubmitting(true);
                      try {
                        await api.createClaim({ report_id: id, proof_text: proofText });
                        setChoice("mine");
                      } catch (err) {
                        alert("Failed to submit claim. You may already have a pending claim for this item.");
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Claim"}
                  </Button>
                  <Button onClick={() => setChoice(null)} variant="text">Cancel</Button>
                </div>
              </div>
            ) : (
              <>
                <p>Does this feel like a match?</p>
                <div className="vote-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <Button onClick={() => setChoice("claiming")} variant="solid">This might be mine</Button>
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
