'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

export default function SelectAction() {
  return (
    <div className="container" style={{ paddingTop: '8rem', paddingBottom: '8rem', minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <span className="subheading">Start Search</span>
        <h1 className="heading-xl">WHAT ARE YOU LOOKING FOR?</h1>
        <p className="body-text" style={{ maxWidth: '400px', margin: '0 auto' }}>
          Select an option below to begin a report.
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', width: '100%', maxWidth: '800px' }}>
        <Link href="/report?type=lost" style={{ display: 'block', textDecoration: 'none' }}>
          <motion.div 
            whileHover="hover"
            initial="initial"
            style={{ padding: '3rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s, border-color 0.3s', height: '100%' }}
            variants={{
              hover: { backgroundColor: 'rgba(240, 92, 85, 0.04)', borderColor: 'rgba(240, 92, 85, 0.2)' }
            }}
          >
            <span className="subheading" style={{ color: 'var(--accent-red)' }}>01</span>
            <h3 className="heading-lg" style={{ marginBottom: '1rem', fontSize: '2rem' }}>I LOST SOMETHING</h3>
            <p className="body-text" style={{ marginBottom: '2rem' }}>Find an item that belongs to you.</p>
            <motion.div 
              style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--accent-red)' }}
              variants={{ hover: { x: 4 } }}
            >
              SUBMIT A LOST REPORT <ArrowUpRight size={20} style={{ marginLeft: '4px' }} />
            </motion.div>
          </motion.div>
        </Link>

        <Link href="/report?type=found" style={{ display: 'block', textDecoration: 'none' }}>
          <motion.div 
            whileHover="hover"
            initial="initial"
            style={{ padding: '3rem', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', transition: 'background-color 0.3s, border-color 0.3s', height: '100%' }}
            variants={{
              hover: { backgroundColor: 'rgba(229, 192, 95, 0.06)', borderColor: 'rgba(229, 192, 95, 0.3)' }
            }}
          >
            <span className="subheading" style={{ color: '#E5A05F' }}>02</span>
            <h3 className="heading-lg" style={{ marginBottom: '1rem', fontSize: '2rem' }}>I FOUND SOMETHING</h3>
            <p className="body-text" style={{ marginBottom: '2rem' }}>Help return an item to its owner.</p>
            <motion.div 
              style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 700, letterSpacing: '0.05em', color: '#E5A05F' }}
              variants={{ hover: { x: 4 } }}
            >
              SUBMIT A FOUND REPORT <ArrowUpRight size={20} style={{ marginLeft: '4px' }} />
            </motion.div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
