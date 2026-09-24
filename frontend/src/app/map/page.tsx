'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navigation, MoreHorizontal, ChevronRight, ArrowRight } from 'lucide-react';
import { PageTop, Button } from '@/components/ManusUI';

export default function MapPage() {
  const router = useRouter();
  
  const campusPins = [
    { label: "North Hall", x: 23, y: 31, count: 8, active: true },
    { label: "Student Union", x: 58, y: 25, count: 5, active: false },
    { label: "West Quad", x: 45, y: 61, count: 12, active: true },
    { label: "Library", x: 75, y: 67, count: 3, active: false },
    { label: "Rec Centre", x: 18, y: 78, count: 4, active: false },
  ];
  
  const [selected, setSelected] = useState(campusPins[2]);
  
  const items = [
    { id: 1, name: "Canvas backpack", time: "Possible match · 4 min ago", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=85" },
    { id: 2, name: "Silver bottle", time: "Found today · 28 min ago", image: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1100&q=85" },
    { id: 3, name: "Everyday rucksack", time: "Reported yesterday", image: "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?auto=format&fit=crop&w=1100&q=85" }
  ];

  return (
    <div className="page-shell map-page">
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
            {campusPins.map((pin) => (
              <div 
                key={pin.label}
                onClick={() => setSelected(pin)}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  padding: '20px 24px',
                  background: selected.label === pin.label ? 'var(--ink)' : 'transparent',
                  color: selected.label === pin.label ? 'var(--cream)' : 'var(--ink)',
                  border: '1px solid',
                  borderColor: selected.label === pin.label ? 'var(--ink)' : 'var(--line)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ 
                    width: '48px', height: '48px', 
                    borderRadius: '50%', 
                    background: selected.label === pin.label ? 'var(--coral)' : (pin.active ? 'var(--yellow)' : 'var(--cream-deep)'), 
                    color: selected.label === pin.label ? '#fff' : 'var(--ink)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: '"DM Mono", monospace', fontSize: '16px', fontWeight: 'bold'
                  }}>
                    {pin.count}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '22px', fontFamily: '"Syne", sans-serif', letterSpacing: '-0.03em' }}>{pin.label}</h3>
                    <span style={{ fontSize: '12px', opacity: selected.label === pin.label ? 0.7 : 0.5 }}>{pin.count} active reports</span>
                  </div>
                </div>
                <ArrowRight size={20} style={{ opacity: selected.label === pin.label ? 1 : 0.2 }} />
              </div>
            ))}
          </div>
        </div>
        <aside className="map-aside">
          <div className="map-aside-head">
            <div>
              <span className="result-kicker">SELECTED AREA</span>
              <h2>{selected.label}</h2>
            </div>
            <MoreHorizontal size={20} />
          </div>
          <div className="map-summary">
            <span className="big-number">{selected.count}</span>
            <span>active reports<br />nearby</span>
          </div>
          <div className="map-list">
            {items.map(item => (
              <div key={item.id} onClick={() => router.push(`/item/${item.id}`)} style={{ cursor: 'pointer' }}>
                <img src={item.image} alt="" />
                <span><b>{item.name}</b><small>{item.time}</small></span>
                <ChevronRight size={16} />
              </div>
            ))}
          </div>
          <Button onClick={() => router.push("/browse")} variant="outline" icon={<ArrowRight size={16} />}>Browse area reports</Button>
        </aside>
      </section>
    </div>
  );
}
