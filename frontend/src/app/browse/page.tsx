'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ArrowUpRight, Map as MapIcon } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';
import { api, ReportOut } from '../../services/api';

export default function BrowsePage() {
  const router = useRouter();
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

  // Simple client side filtering
  const filteredReports = category === "All reports" 
    ? reports 
    : reports.filter(r => (r.item_category || "").toLowerCase().includes(category.toLowerCase()));

  if (dataLoading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading found items...</div>;
  }

  return (
    <div className="page-shell browse-page">
      <PageTop 
        eyebrow="Browse found items" 
        title={<>A visual map of<br /><em>what’s been found.</em></>} 
        intro="Browse public-safe report previews from across campus. Details stay inside the right flow." 
        action={<Button onClick={() => router.push("/map")} variant="outline" icon={<MapIcon size={16} />}>Open map</Button>} 
      />
      <div className="browse-toolbar container-wide">
        <div className="category-tabs">
          {categories.map((c) => (
            <button key={c} className={category === c ? "tab-active" : ""} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <button className="filter-button"><Filter size={15} />Filters</button>
      </div>
      
      {error && (
        <section className="container-wide" style={{ color: 'var(--coral)', marginBottom: '2rem' }}>
          <p>{error}</p>
        </section>
      )}

      <section className="browse-grid container-wide">
        {filteredReports.length === 0 && !error ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '4rem 0', textAlign: 'center' }}>
            <span>NO FOUND ITEMS</span>
            <h2>Nothing matches right now.</h2>
            <p>We don't have any active found reports matching this filter.</p>
          </div>
        ) : (
          filteredReports.map((item, i) => (
            <button className={`browse-card browse-card-${i}`} key={item.report_id} onClick={() => router.push(`/item/${item.report_id}`)}>
              <div className="browse-image">
                {item.image_reference ? (
                   <img src={item.image_reference} alt={item.item_category || "Item"} />
                ) : (
                   <div style={{width: '100%', height: '100%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>No Image</div>
                )}
                <span>Found Item</span>
              </div>
              <div className="browse-card-copy">
                <div>
                  <span>{item.location || "Unknown location"}</span>
                  <h3>{item.item_category || "Untitled Item"}</h3>
                </div>
                <ArrowUpRight size={17} />
              </div>
            </button>
          ))
        )}
      </section>
      <section className="browse-bottom container-wide">
        <div>
          <SectionLabel>Browse with care</SectionLabel>
          <h2>Real reports.<br /><em>Respectful previews.</em></h2>
        </div>
        <p>Found-item photos are shown here because you’re inside the discovery flow. We don’t use them as homepage decoration or expose claimant details.</p>
      </section>
    </div>
  );
}
