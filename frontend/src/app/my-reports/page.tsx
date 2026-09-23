'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Calendar, CheckCircle, Search as SearchIcon, AlertCircle, X, User as UserIcon, Mail } from 'lucide-react';
import Link from 'next/link';

// Expanded Mock data representing the user's reports
const MOCK_REPORTS = [
  {
    id: 'RPT-8492',
    type: 'LOST',
    title: 'Silver Metallic Water Bottle',
    date: 'Oct 24, 2023',
    location: 'Science Library, 3rd Floor',
    status: 'ACTIVE',
    matches: 3,
    img: '/mocks/step1.jpg',
    description: 'I left my Aether metallic water bottle on a desk near the back windows of the 3rd floor. It has a slight dent on the bottom edge.',
    reporterName: 'Anika Jain',
    contactEmail: 'anika.bin@gmail.com',
    matchDetails: [
      { id: 'M-102', matchType: 'FOUND', location: 'Science Library Lost & Found', date: 'Oct 25, 2023', similarity: '94%' },
      { id: 'M-105', matchType: 'FOUND', location: 'Student Center Desk', date: 'Oct 25, 2023', similarity: '78%' }
    ]
  },
  {
    id: 'RPT-7731',
    type: 'FOUND',
    title: 'Black Leather Wallet',
    date: 'Oct 22, 2023',
    location: 'Dining Hall Area B',
    status: 'RESOLVED',
    matches: 1,
    img: '/mocks/step2.jpg',
    description: 'Found a black leather bi-fold wallet under a table in Area B. Handed it over to the Dining Hall manager.',
    reporterName: 'Anika Jain',
    contactEmail: 'anika.bin@gmail.com',
    matchDetails: []
  },
  {
    id: 'RPT-6190',
    type: 'LOST',
    title: 'Graphing Calculator (TI-84)',
    date: 'Oct 15, 2023',
    location: 'Math Building Room 102',
    status: 'ACTIVE',
    matches: 0,
    img: '/mocks/step3.jpg',
    description: 'TI-84 Plus CE, black color. I think I left it under my chair during the 10am lecture. Need it for finals!',
    reporterName: 'Anika Jain',
    contactEmail: 'anika.bin@gmail.com',
    matchDetails: []
  }
];

export default function MyReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selectedReport, setSelectedReport] = useState<any | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (selectedReport) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [selectedReport]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-purple)' }}>
        Loading your reports...
      </div>
    );
  }

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%', position: 'relative' }}>
      <div style={{ marginBottom: '3rem' }}>
        <span className="subheading">DASHBOARD</span>
        <h1 className="heading-lg" style={{ fontSize: '3rem', margin: '0.5rem 0' }}>MY REPORTS</h1>
        <p style={{ color: 'var(--text-purple)', opacity: 0.7, maxWidth: '600px', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Track the status of items you have reported lost or found across campus. Review AI-suggested matches and coordinate returns.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '2rem' }}>
        {MOCK_REPORTS.map((report, i) => (
          <motion.div
            key={report.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            style={{
              backgroundColor: 'var(--white)',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Header / Image Area */}
            <div style={{ position: 'relative', height: '160px', backgroundColor: 'var(--bg-cream)' }}>
              <div style={{ position: 'absolute', top: '1rem', left: '1rem', display: 'flex', gap: '0.5rem', zIndex: 2 }}>
                <span style={{ 
                  backgroundColor: report.type === 'LOST' ? 'var(--accent-red)' : 'var(--text-purple)',
                  color: 'var(--white)',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '100px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em'
                }}>
                  {report.type}
                </span>
                <span style={{ 
                  backgroundColor: report.status === 'ACTIVE' ? 'rgba(255,255,255,0.9)' : '#E8F5E9',
                  color: report.status === 'ACTIVE' ? 'var(--text-purple)' : '#2E7D32',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '100px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                }}>
                  {report.status}
                </span>
              </div>
              <img 
                src={report.img} 
                alt={report.title} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.85 }}
              />
            </div>

            {/* Content Area */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                {report.id}
              </div>
              <h3 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.4rem', color: 'var(--text-purple)', marginBottom: '1rem', lineHeight: 1.2 }}>
                {report.title}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.8 }}>
                  <Calendar size={14} />
                  {report.date}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.8 }}>
                  <MapPin size={14} />
                  {report.location}
                </div>
              </div>

              {/* Action Area */}
              <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {report.status === 'RESOLVED' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2E7D32', fontSize: '0.85rem', fontWeight: 600 }}>
                    <CheckCircle size={16} /> Item Returned
                  </div>
                ) : report.matches > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-red)', fontSize: '0.85rem', fontWeight: 700 }}>
                    <AlertCircle size={16} /> {report.matches} Matches Found
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-purple)', opacity: 0.6, fontSize: '0.85rem', fontWeight: 600 }}>
                    <SearchIcon size={16} /> Scanning...
                  </div>
                )}
                
                <button 
                  onClick={() => setSelectedReport(report)}
                  className="btn btn-outline" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                >
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Empty State / Add New */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Link href="/report?type=lost" style={{ textDecoration: 'none' }}>
            <div style={{
              height: '100%',
              minHeight: '380px',
              border: '2px dashed var(--border-color)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              color: 'var(--text-purple)',
              backgroundColor: 'rgba(255,255,255,0.3)'
            }} className="hover:bg-white hover:border-text-purple">
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--bg-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <SearchIcon size={20} color="var(--accent-red)" />
              </div>
              <h3 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.2rem', marginBottom: '0.5rem' }}>FILE NEW REPORT</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.6 }}>Lost or found something else?</p>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedReport(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(15, 9, 25, 0.7)',
              backdropFilter: 'blur(8px)',
              zIndex: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem'
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
              style={{
                backgroundColor: 'var(--white)',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '700px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <button 
                onClick={() => setSelectedReport(null)}
                style={{
                  position: 'absolute',
                  top: '1.5rem',
                  right: '1.5rem',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <X size={18} />
              </button>

              <div style={{ position: 'relative', width: '100%', height: '250px', backgroundColor: 'var(--bg-cream)' }}>
                <img src={selectedReport.img} alt={selectedReport.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ padding: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <span style={{ 
                    backgroundColor: selectedReport.type === 'LOST' ? 'var(--accent-red)' : 'var(--text-purple)',
                    color: 'var(--white)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '100px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em'
                  }}>
                    {selectedReport.type}
                  </span>
                  <span style={{ color: 'var(--accent-red)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                    {selectedReport.id}
                  </span>
                </div>

                <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '2.5rem', color: 'var(--text-purple)', marginBottom: '1.5rem', lineHeight: 1.1 }}>
                  {selectedReport.title}
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <Calendar size={18} color="var(--accent-red)" style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-purple)', opacity: 0.6, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>DATE {selectedReport.type === 'LOST' ? 'LOST' : 'FOUND'}</div>
                      <div style={{ fontSize: '1rem', color: 'var(--text-purple)', fontWeight: 500 }}>{selectedReport.date}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <MapPin size={18} color="var(--accent-red)" style={{ marginTop: '2px' }} />
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-purple)', opacity: 0.6, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.25rem' }}>LOCATION</div>
                      <div style={{ fontSize: '1rem', color: 'var(--text-purple)', fontWeight: 500 }}>{selectedReport.location}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-purple)', opacity: 0.6, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.75rem' }}>DESCRIPTION</div>
                  <p style={{ color: 'var(--text-purple)', opacity: 0.9, lineHeight: 1.6 }}>
                    {selectedReport.description}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-cream)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-purple)', opacity: 0.6, fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem' }}>CONTACT INFO</div>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-purple)' }}>
                      <UserIcon size={16} />
                      <span style={{ fontWeight: 500 }}>{selectedReport.reporterName}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-purple)' }}>
                      <Mail size={16} />
                      <span style={{ fontWeight: 500 }}>{selectedReport.contactEmail}</span>
                    </div>
                  </div>
                </div>

                {selectedReport.matches > 0 && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem' }}>AI MATCHES ({selectedReport.matches})</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {selectedReport.matchDetails.map((match: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-purple)', marginBottom: '0.25rem' }}>{match.id} - {match.matchType}</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.7 }}>{match.location} • {match.date}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-red)' }}>{match.similarity}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-purple)', opacity: 0.5, fontWeight: 600 }}>CONFIDENCE</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
