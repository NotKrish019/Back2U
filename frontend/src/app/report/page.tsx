'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { api, ReportCreate } from '../../services/api';
import { ImageIcon } from 'lucide-react';

export default function ReportPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'found';
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<ReportCreate>({
    report_type: type as 'lost' | 'found',
    item_category: '',
    description: '',
    location: '',
    image_reference: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 2) {
      setStep(2);
      return;
    }
    
    setLoading(true);
    try {
      await api.createReport(formData);
      if (formData.report_type === 'lost') {
        router.push(`/search?desc=${encodeURIComponent(formData.item_category + ' ' + formData.description)}`);
      } else {
        alert('Found report submitted successfully!');
        router.push('/');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const steps = ["ITEM", "DETAILS", "PHOTO", "LOCATION", "REVIEW"];

  return (
    <div className="container" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4rem' }}>
        <div>
          <span className="subheading">REPORT {type.toUpperCase()} • 0{step} / 05</span>
          <h1 className="heading-xl" style={{ fontSize: '3.5rem', marginBottom: '0.5rem' }}>
            I {type === 'lost' ? 'LOST' : 'FOUND'} SOMETHING
          </h1>
          <p className="body-text">A few details could help get it back to its owner.</p>
        </div>
        
        <div style={{ width: '300px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            <span>REPORT PROGRESS</span>
            <span style={{ color: 'var(--accent-red)' }}>0{step} / 05</span>
          </div>
          <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem' }}>
            {steps.map((_, i) => (
              <div key={i} style={{ height: '2px', flex: 1, backgroundColor: i < step ? 'var(--accent-red)' : 'var(--border-color)' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', fontWeight: 700, color: 'var(--card-purple)', letterSpacing: '0.05em' }}>
            {steps.map((s, i) => (
              <span key={s} style={{ color: i + 1 === step ? 'var(--accent-red)' : 'inherit' }}>
                0{i+1} {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-2" style={{ gap: '4rem' }}
            >
              {/* Left Column: Photo */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span className="input-label" style={{ margin: 0 }}>PHOTO <span style={{ color: 'var(--accent-red)', fontWeight: 400 }}>RECOMMENDED</span></span>
                  <span className="caption">Preview added</span>
                </div>
                
                <div style={{ 
                  aspectRatio: '1', backgroundColor: '#E0DBD4', borderRadius: '4px', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', overflow: 'hidden'
                }}>
                  {formData.image_reference ? (
                    <img src={formData.image_reference} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <div style={{ width: '48px', height: '48px', backgroundColor: 'var(--white)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                        <ImageIcon size={20} color="var(--text-dark)" />
                      </div>
                      <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-purple)', marginBottom: '1rem' }}>A clear photo makes it easier to recognise.</p>
                      <button type="button" className="btn btn-outline" style={{ backgroundColor: 'var(--white)', border: 'none' }} onClick={() => {
                        const url = prompt("Enter image URL for demo:");
                        if (url) setFormData({...formData, image_reference: url});
                      }}>
                        CHOOSE PHOTO
                      </button>
                    </>
                  )}
                </div>
                <p className="caption" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ border: '1px solid currentColor', borderRadius: '50%', width: '14px', height: '14px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>i</span>
                  Don't include faces, student IDs, or private information.
                </p>
              </div>

              {/* Right Column: Fields */}
              <div>
                <div className="input-group">
                  <label className="input-label">WHAT DID YOU {type === 'lost' ? 'LOSE' : 'FIND'}? <span>REQUIRED</span></label>
                  <input 
                    type="text" className="input" 
                    placeholder="Describe the item (e.g. Black Nike Backpack)" 
                    value={formData.item_category}
                    onChange={e => setFormData({...formData, item_category: e.target.value})}
                    required
                  />
                  <p className="caption" style={{ marginTop: '0.5rem' }}>Mention colour, brand, marks, or anything distinctive.</p>
                </div>

                <div className="grid grid-cols-2">
                  <div className="input-group">
                    <label className="input-label">WHERE DID YOU {type === 'lost' ? 'LOSE' : 'FIND'} IT? <span>REQUIRED</span></label>
                    <input 
                      type="text" className="input" 
                      placeholder="e.g. Central Library" 
                      value={formData.location}
                      onChange={e => setFormData({...formData, location: e.target.value})}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">WHEN DID YOU {type === 'lost' ? 'LOSE' : 'FIND'} IT? <span>REQUIRED</span></label>
                    <input type="text" className="input" defaultValue="Today • 2:14 PM" />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">CONTACT NOTE <span style={{ color: 'var(--card-purple)', fontWeight: 400 }}>OPTIONAL</span></label>
                  <textarea 
                    className="textarea" 
                    placeholder="Anything someone would recognise?"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                  <p className="caption" style={{ marginTop: '0.5rem' }}>Leave out private identifying details.</p>
                </div>

                <div className="divider" style={{ margin: '2rem 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button type="button" style={{ background: 'none', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-purple)' }}>
                    Save for later
                  </button>
                  <button type="submit" className="btn btn-primary">
                    CONTINUE &rarr;
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}
            >
              <h2 className="heading-lg" style={{ marginBottom: '2rem' }}>REVIEW & SUBMIT</h2>
              <div style={{ backgroundColor: 'var(--white)', padding: '2rem', borderRadius: '4px', border: '1px solid var(--border-color)', marginBottom: '2rem', textAlign: 'left' }}>
                <p><strong>Type:</strong> {formData.report_type.toUpperCase()}</p>
                <p><strong>Item:</strong> {formData.item_category}</p>
                <p><strong>Location:</strong> {formData.location}</p>
                <p><strong>Notes:</strong> {formData.description}</p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button type="button" className="btn btn-outline" onClick={() => setStep(1)}>BACK</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
