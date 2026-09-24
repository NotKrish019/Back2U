'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter, ArrowUpRight, Map as MapIcon } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';

export default function BrowsePage() {
  const router = useRouter();
  const [category, setCategory] = useState("All reports");
  const categories = ["All reports", "Bags", "Tech", "Cards & keys", "Clothing"];
  
  const items = [
    { id: 1, name: "Sand canvas backpack", location: "West Quad · Bench 04", match: "Strong visual match", image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=85" },
    { id: 2, name: "Canvas daypack", location: "Student Union · 2nd floor", match: "Similar appearance", image: "https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=1100&q=85" },
    { id: 3, name: "Everyday rucksack", location: "Library steps", match: "Possible match", image: "https://images.unsplash.com/photo-1491637639811-60e2756cc1c7?auto=format&fit=crop&w=1100&q=85" }
  ];

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
        <button className="filter-button"><Filter size={15} />Filters <span>2</span></button>
      </div>
      <section className="browse-grid container-wide">
        {items.map((item, i) => (
          <button className={`browse-card browse-card-${i}`} key={item.id} onClick={() => router.push(`/item/${item.id}`)}>
            <div className="browse-image">
              <img src={item.image} alt={item.name} />
              <span>{item.match}</span>
            </div>
            <div className="browse-card-copy">
              <div>
                <span>{item.location}</span>
                <h3>{item.name}</h3>
              </div>
              <ArrowUpRight size={17} />
            </div>
          </button>
        ))}
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
