'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { api, RetrievalResult } from '../../services/api';
import Link from 'next/link';

export default function SearchPage() {
  const searchParams = useSearchParams();
  const initialDesc = searchParams.get('desc') || '';
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    if (initialDesc) {
      handleSearch(initialDesc);
    }
  }, [initialDesc]);

  const handleSearch = async (query: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.search({ text: query, top_k: 6 });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="subheading" style={{ color: '#E5A05F' }}>FIND AN ITEM / RESULTS</span>
          <h1 className="heading-xl" style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>POSSIBLE MATCHES</h1>
          <p className="body-text">We found things that look similar.</p>
        </motion.div>
        
        {initialDesc && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            style={{ backgroundColor: '#E5C05F', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-dark)' }}
          >
            <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(0,0,0,0.1)' }}></div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.2rem' }}>{initialDesc}</div>
              <Link href="/report?type=lost" style={{ fontSize: '0.75rem', textDecoration: 'underline' }}>Edit search</Link>
            </div>
          </motion.div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '1rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em' }}>
        <span>FILTER RESULTS</span>
        <div style={{ display: 'flex', gap: '2rem' }}>
          {['ALL', 'STRONG MATCH', 'NEARBY'].map(f => (
            <button 
              key={f} 
              onClick={() => setFilter(f)}
              style={{ 
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontWeight: filter === f ? 800 : 500,
                color: filter === f ? 'var(--text-dark)' : 'var(--text-purple)',
                textDecoration: filter === f ? 'underline' : 'none',
                textUnderlineOffset: '4px'
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '4rem 0' }}>Searching...</div>}
      {error && <div style={{ color: 'var(--accent-red)' }}>{error}</div>}

      {result && !loading && (
        <motion.div 
          className="grid grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
        >
          {result.results.map((item) => (
            <Link key={item.item_instance_id} href={`/item/${item.item_instance_id}`}>
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                style={{ cursor: 'pointer', group: 'true' }}
              >
                <div style={{ width: '100%', aspectRatio: '1', backgroundColor: '#E0DBD4', marginBottom: '1rem', transition: 'transform 0.3s ease' }} className="hover:scale-[1.02]" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div className="subheading" style={{ marginBottom: '0.2rem' }}>
                      {item.similarity_score > 0.8 ? 'STRONG MATCH' : 'POSSIBLE MATCH'}
                    </div>
                    <h3 className="heading-md" style={{ fontSize: '1.25rem' }}>{item.item_instance_id}</h3>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-purple)' }}>
                    {(item.similarity_score * 100).toFixed(0)}%
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
}
