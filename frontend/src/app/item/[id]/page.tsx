'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Heart, ZoomIn, ShieldCheck } from 'lucide-react';
import { SectionLabel, Button } from '../../report/lost/ManusUILab';
import { api, ReportOut } from '@/services/api';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import '../../report/lost/report.css';

export default function DetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
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
        <GlobalMeshBackground />
        <h2>Report not found</h2>
        <p>{error}</p>
        <div style={{ marginTop: '2rem' }}>
          <Button onClick={() => router.push("/browse")} variant="solid">Browse public reports</Button>
        </div>
      </div>
    );
  }

  const imageUrl = item.image_reference ? (item.image_reference.match(/^(http|blob:|data:)/) ? item.image_reference : `http://127.0.0.1:8000${item.image_reference.startsWith('/') ? '' : '/'}${item.image_reference}`) : null;
  const isResolved = item.status === 'resolved';
  const badge = isResolved ? 'RESOLVED' : (item.report_type === 'lost' ? 'SEARCHING' : 'HELD');
  const badgeColor = isResolved ? 'bg-[#98FF98]' : (item.report_type === 'lost' ? 'bg-[#FF3E72] text-white' : 'bg-[#FFD700]');

  return (
    <div className="page-shell relative min-h-screen font-mono">
      <GlobalMeshBackground />
      <div className="w-full min-h-screen py-12 md:py-24 px-4 flex justify-center items-start">
        <div className="w-full max-w-4xl">
          <button onClick={() => router.push("/search")} className="flex items-center gap-2 mb-6 text-sm font-bold uppercase tracking-widest text-retro-charcoal hover:opacity-70 transition-opacity">
            <ArrowLeft size={16} /> Back to results
          </button>
          
          <div className="bg-surface border-2 border-retro-border shadow-[8px_8px_0px_#1A1A1A] flex flex-col w-full overflow-hidden relative z-10">
            {/* Window Header */}
            <div className="bg-window-bar-gray px-4 py-3 border-b-2 border-retro-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-hot-pink border border-retro-border"></div>
                <div className="w-3 h-3 rounded-full bg-pastel-yellow-gold border border-retro-border"></div>
                <div className="w-3 h-3 rounded-full bg-pastel-mint border border-retro-border"></div>
                <span className="ml-2 font-bold text-[12px] text-retro-charcoal tracking-widest uppercase">SYS_REPORT_DETAIL.EXE</span>
              </div>
            </div>

            {/* Window Body */}
            <div className="flex flex-col md:flex-row bg-surface-canvas">
              {/* Left Column (Image) */}
              <div className={`border-b-2 md:border-b-0 md:border-r-2 border-retro-border ${imageUrl ? 'w-full md:w-1/2' : 'hidden'}`}>
                <div className="h-64 md:h-full w-full bg-surface-warm-grey relative p-4 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] mix-blend-overlay pointer-events-none"></div>
                  {imageUrl ? (
                    <div className="w-full h-full border-2 border-retro-border relative overflow-hidden shadow-[4px_4px_0px_#1A1A1A]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl} alt={item.item_category} className="object-cover w-full h-full relative z-0" />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Right Column (Details) */}
              <div className={`p-6 md:p-8 flex-1 flex flex-col ${!imageUrl ? 'md:w-full' : ''}`}>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2 py-1 bg-surface border-2 border-retro-border text-[10px] font-bold text-retro-charcoal uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A]">
                      {item.report_type.toUpperCase()} REPORT
                    </span>
                    <span className={`px-2 py-1 border-2 border-retro-border text-[10px] font-bold text-retro-charcoal uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] ${badgeColor}`}>
                      {badge}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-retro-charcoal leading-tight mb-4">
                    {item.item_category || "Untitled Item"}
                  </h2>
                  <p className="text-base text-on-surface-variant leading-relaxed">
                    {item.description || "No description provided."}
                  </p>
                </div>

                <div className="space-y-4 pt-6 border-t-2 border-retro-border/30 mt-auto">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">[ LOCATION_DATA ]</div>
                    <div className="text-sm font-bold text-retro-charcoal uppercase">{item.location || "Unknown"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">[ TIMESTAMP ]</div>
                    <div className="text-sm font-bold text-retro-charcoal uppercase">{new Date(item.created_at).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">[ SYSTEM_STATUS ]</div>
                    <div className={`text-sm font-bold uppercase ${isResolved ? 'text-green-600' : 'text-[#FF3E72]'}`}>{item.status.toUpperCase()}</div>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t-2 border-retro-border/30 flex flex-col sm:flex-row justify-end gap-4">
                  <button onClick={() => router.push("/my-reports")} className="px-5 py-2.5 bg-surface-sand text-retro-charcoal border-2 border-retro-border font-bold text-[12px] uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:bg-surface-warm-grey transition-colors cursor-pointer flex items-center justify-center gap-2">
                    <Heart size={14} /> Save Report
                  </button>
                  <button 
                    className="px-5 py-2.5 bg-hot-pink text-white border-2 border-retro-border font-bold text-[12px] uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:-translate-y-0.5 transition-transform cursor-pointer flex items-center justify-center gap-2"
                    onClick={() => router.push(`/item/${item.report_id}/compare`)}
                  >
                    Compare Photo <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
