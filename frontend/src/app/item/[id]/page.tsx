'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, ZoomIn, ShieldCheck } from 'lucide-react';
import { SectionLabel, Button } from '@/components/ManusUI';
import { api, ReportOut } from '../../../services/api';

export default function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [open, setOpen] = useState(true);
  
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

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading report details...</div>;
  }

  if (error || !item) {
    return (
      <div className="page-shell detail-page" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2>Report not found</h2>
        <p>{error}</p>
        <div style={{ marginTop: '2rem' }}>
          <Button onClick={() => router.push("/browse")} variant="solid">Browse public reports</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell detail-page">
      <div className="detail-back container-wide">
        <button onClick={() => router.push("/search")}><ArrowLeft size={16} />Back to results</button>
        <span>Report {item.report_id}</span>
      </div>
      <section className="detail-layout container-wide">
        <div className="detail-photo-wrap">
          {item.image_reference ? (
            <img src={item.image_reference} alt={item.item_category || "Report image"} />
          ) : (
            <div style={{ width: '100%', height: '400px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              No photo available
            </div>
          )}
          <div className="photo-controls">
            <button><ZoomIn size={15} />View larger</button>
            <span>Photo shared by campus community</span>
          </div>
        </div>
        <div className="detail-copy">
          <SectionLabel>{item.report_type === 'found' ? "Found Item" : "Lost Item"}</SectionLabel>
          <h1>{item.item_category || "Untitled Item"}</h1>
          <div className="detail-status">
            <span className="status-pip" />{item.status}<span>·</span>{new Date(item.created_at).toLocaleString()}
          </div>
          <p className="detail-description">{item.description || "No description provided."}</p>
          <div className="detail-meta">
            <div><span>Last reported at</span><b>{item.location || "Unknown"}</b></div>
          </div>
          <div className="detail-actions" style={{ marginTop: '2rem' }}>
            <Button onClick={() => router.push(`/item/${item.report_id}/compare`)} variant="solid" icon={<ArrowRight size={17} />}>Compare with my photo</Button>
            <Button onClick={() => router.push("/my-reports")} variant="text" icon={<Heart size={17} />}>Save this report</Button>
          </div>
        </div>
      </section>
      <section className="contact-callout container-wide">
        <div>
          <SectionLabel>Next step</SectionLabel>
          <h2>Could this be<br /><em>your item?</em></h2>
        </div>
        <p>If the comparison feels right, you can mark it as a possible match. We’ll keep your details private while the report owner is contacted.</p>
        <Button onClick={() => router.push(`/item/${item.report_id}/compare`)} variant="outline" icon={<ArrowUpRight size={16} />}>Open comparison</Button>
      </section>
    </div>
  );
}
