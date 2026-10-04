'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, MoreHorizontal, ChevronRight, ArrowRight } from 'lucide-react';
import { PageTop, Button } from '../report/lost/ManusUILab';
import { api, ReportOut } from '@/services/api';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import '../report/lost/report.css';

export default function MapPage() {
  const router = useRouter();
  
  const [reports, setReports] = useState<ReportOut[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  useEffect(() => {
    api.getAllReports()
      .then((data) => {
        setReports(data.filter(r => r.status === 'open'));
      })
      .catch((err) => console.error(err))
      .finally(() => setDataLoading(false));
  }, []);

  // Compute location frequencies
  const locationCounts: Record<string, number> = {};
  reports.forEach(r => {
    if (r.location) {
      // Basic text cleanup for matching
      const loc = r.location.split('(')[0].trim();
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    }
  });

  const hotspots = Object.entries(locationCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  if (dataLoading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading campus signals...</div>;
  }

  return (
    <div className="page-shell map-page">
      <GlobalMeshBackground />
      <PageTop 
        eyebrow="Campus signal" 
        title={<>Where things<br /><em>turn up.</em></>} 
        intro="A quick read of recent found reports. Select a campus hotspot to see what’s waiting nearby." 
        action={
          <div className="map-legend">
            <span><i className="legend-dot legend-coral" />Recent reports</span>
            <span><i className="legend-dot legend-yellow" />Active pickup</span>
          </div>
        } 
      />
      <section className="map-layout container-wide">
        <div className="hotspots-board" style={{ padding: '40px', background: 'var(--paper)', border: '1px solid var(--line)' }}>
          <h2 style={{ fontFamily: '"Syne", sans-serif', fontSize: '36px', marginBottom: '8px', letterSpacing: '-0.04em' }}>Campus Hotspots</h2>
          <p style={{ color: 'var(--ink-soft)', marginBottom: '32px', fontSize: '14px', lineHeight: 1.5 }}>Areas with the highest volume of active reports.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {hotspots.length === 0 ? (
              <div style={{ padding: '2rem 0', opacity: 0.5 }}>Insufficient report data to generate campus hotspots.</div>
            ) : (
              hotspots.map((pin) => (
                <div 
                  key={pin.label}
                  onClick={() => setSelectedLocation(selectedLocation === pin.label ? null : pin.label)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    background: selectedLocation === pin.label ? 'var(--ink)' : 'transparent',
                    color: selectedLocation === pin.label ? 'var(--cream)' : 'var(--ink)',
                    border: '1px solid',
                    borderColor: selectedLocation === pin.label ? 'var(--ink)' : 'var(--line)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ 
                      width: '48px', height: '48px', 
                      borderRadius: '50%', 
                      background: selectedLocation === pin.label ? 'var(--coral)' : 'var(--cream-deep)', 
                      color: selectedLocation === pin.label ? '#fff' : 'var(--ink)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: '"DM Mono", monospace', fontSize: '16px', fontWeight: 'bold'
                    }}>
                      {pin.count}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '22px', fontFamily: '"Syne", sans-serif', letterSpacing: '-0.03em' }}>{pin.label}</h3>
                      <span style={{ fontSize: '12px', opacity: selectedLocation === pin.label ? 0.7 : 0.5 }}>{pin.count} active reports</span>
                    </div>
                  </div>
                  <ArrowRight size={20} style={{ opacity: selectedLocation === pin.label ? 1 : 0.2 }} />
                </div>
              ))
            )}
          </div>
        </div>
        <aside className="map-aside">
          {selectedLocation ? (() => {
            const selectedCount = hotspots.find(h => h.label === selectedLocation)?.count || 0;
            const locationItems = reports.filter(r => r.location?.includes(selectedLocation));
            
            return (
              <>
                <div className="map-aside-head">
                  <div>
                    <span className="result-kicker">SELECTED AREA</span>
                    <h2>{selectedLocation}</h2>
                  </div>
                  <MoreHorizontal size={20} />
                </div>
                <div className="map-summary">
                  <span className="big-number">{selectedCount}</span>
                  <span>active reports<br />nearby</span>
                </div>
                <div className="map-list">
                  {locationItems.slice(0, 5).map(item => (
                    <div key={item.report_id} onClick={() => router.push(`/item/${item.report_id}`)} style={{ cursor: 'pointer' }}>
                      {item.image_reference ? <img src={item.image_reference} alt="" /> : <div style={{width: '48px', height:'48px', background: '#eee'}} />}
                      <span><b>{item.item_category || "Unknown Item"}</b><small>{new Date(item.created_at).toLocaleDateString()}</small></span>
                      <ChevronRight size={16} />
                    </div>
                  ))}
                </div>
                <Button onClick={() => router.push("/browse")} variant="outline" icon={<ArrowRight size={16} />}>Browse area reports</Button>
              </>
            );
          })() : (
             <div style={{ padding: '2rem', opacity: 0.5 }}>Select a hotspot to view active reports in that area.</div>
          )}
        </aside>
      </section>
    </div>
  );
}
