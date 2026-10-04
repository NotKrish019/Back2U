"use client";

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { SectionLabel } from '../report/lost/ManusUILab';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import '../report/lost/report.css';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('candidates');
  const [overview, setOverview] = useState<any>(null);
  const [claims, setClaims] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [uncertain, setUncertain] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadOverview();
    loadData();
  }, [activeTab]);

  const loadOverview = async () => {
    try {
      const data = await api.getAdminOverview();
      setOverview(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'claims') {
        const data = await api.getAdminClaims();
        setClaims(data);
      } else if (activeTab === 'candidates') {
        const data = await api.getAdminCandidates('pending');
        setCandidates(data);
      } else if (activeTab === 'uncertain') {
        const data = await api.getAdminCandidates('pending', true);
        setUncertain(data);
      } else if (activeTab === 'reports') {
        const data = await api.getAdminReports();
        setReports(data);
      } else if (activeTab === 'items') {
        const data = await api.getAdminItems(true);
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClaim = async (id: string, status: string) => {
    try {
      await api.updateAdminClaim(id, status);
      await loadOverview();
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateCandidate = async (id: string, status: string) => {
    try {
      await api.updateAdminCandidate(id, status);
      await loadOverview();
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <main className="page-shell">
      <GlobalMeshBackground />
      <div className="container-wide">
        <div style={{ paddingTop: '60px', paddingBottom: '40px' }}>
          <SectionLabel light={false}>Staff Operations</SectionLabel>
          <h2 style={{ fontSize: '32px', margin: '15px 0' }}>Overview</h2>
          
          {overview ? (
            <div className="reports-summary" style={{ marginTop: '20px' }}>
              <div>
                <span>Pending Claims</span>
                <b>{overview.pending_claims}</b>
              </div>
              <div>
                <span>Pending Matches</span>
                <b>{overview.pending_matches}</b>
              </div>
              <div style={{ borderColor: overview.uncertain_matches > 0 ? 'var(--coral)' : 'inherit' }}>
                <span>Uncertain Matches (&lt;80%)</span>
                <b>{overview.uncertain_matches}</b>
              </div>
              <div>
                <span>Open Lost Reports</span>
                <b>{overview.open_lost_reports}</b>
              </div>
              <div>
                <span>Recently Found (Open)</span>
                <b>{overview.recently_found}</b>
              </div>
              <div>
                <span>Returned Items</span>
                <b>{overview.returned_items}</b>
              </div>
            </div>
          ) : (
             <div className="empty-state" style={{ minHeight: '100px' }}>
               <div className="orbit-ring" style={{ width: '20px', height: '20px', position: 'relative' }}></div>
             </div>
          )}
        </div>

        <div className="page-top-action" style={{ borderBottom: '1px solid var(--line)', paddingBottom: '20px', marginBottom: '40px' }}>
          <div className="category-tabs" style={{ justifyContent: 'flex-start' }}>
            <button 
              className={activeTab === 'candidates' ? 'tab-active' : ''} 
              onClick={() => setActiveTab('candidates')}
            >Candidate Matches</button>
            <button 
              className={activeTab === 'uncertain' ? 'tab-active' : ''} 
              onClick={() => setActiveTab('uncertain')}
            >Uncertain Cases</button>
            <button 
              className={activeTab === 'claims' ? 'tab-active' : ''} 
              onClick={() => setActiveTab('claims')}
            >Claims</button>
            <button 
              className={activeTab === 'reports' ? 'tab-active' : ''} 
              onClick={() => setActiveTab('reports')}
            >Open Reports</button>
            <button 
              className={activeTab === 'items' ? 'tab-active' : ''} 
              onClick={() => setActiveTab('items')}
            >Returned Items</button>
          </div>
        </div>

        <div>
          {loading ? (
             <div className="empty-state">
               <div className="orbit-ring" style={{ width: '30px', height: '30px', position: 'relative' }}></div>
               <p style={{ marginTop: '10px' }}>Loading queue...</p>
             </div>
          ) : (
            <>
              {activeTab === 'claims' && (
                <div className="timeline">
                  {claims.length === 0 ? (
                     <div className="empty-state">
                       <span>Queue Empty</span>
                       <h2>No Claims</h2>
                       <p>There are currently no claims requiring review.</p>
                     </div>
                  ) : (
                    claims.map(claim => (
                      <div key={claim.claim_id} className="timeline-row">
                        <div className={`timeline-marker ${claim.status === 'pending' ? 'marker-yellow' : (claim.status === 'approved' ? 'marker-coral' : 'marker-blue')}`}>
                          {claim.status === 'pending' ? 'PEND' : claim.status.substring(0, 4).toUpperCase()}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-top">
                            <span>CLAIMANT: {claim.claimer_user_id}</span>
                            <small>{new Date(claim.created_at).toLocaleDateString()}</small>
                          </div>
                          <div style={{ marginTop: '10px' }}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 'bold' }}>LOST REPORT</span>
                            <h4 style={{ margin: '2px 0 10px 0', fontSize: '14px' }}>{claim.report?.item_category || claim.report_id}</h4>
                          </div>
                          
                          <div style={{ background: 'var(--paper)', padding: '15px', border: '1px solid var(--line)', borderRadius: '8px', marginTop: '10px' }}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 'bold' }}>OWNERSHIP EVIDENCE</span>
                            <p style={{ margin: '5px 0 0 0', fontSize: '13px' }}>{claim.proof_text}</p>
                          </div>
                        </div>
                        <div className="timeline-actions" style={{ display: 'flex', gap: '10px', alignSelf: 'center' }}>
                          {claim.status === 'pending' && (
                            <>
                              <button className="button button-outline" onClick={() => handleUpdateClaim(claim.claim_id, 'denied')}>Deny</button>
                              <button className="button button-solid" onClick={() => handleUpdateClaim(claim.claim_id, 'approved')}>Approve</button>
                            </>
                          )}
                          {claim.status !== 'pending' && (
                            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>{claim.status.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {(activeTab === 'candidates' || activeTab === 'uncertain') && (
                <div className="timeline">
                   {((activeTab === 'candidates' ? candidates : uncertain).length === 0) ? (
                     <div className="empty-state">
                       <span>Queue Empty</span>
                       <h2>No Candidate Matches</h2>
                       <p>There are currently no matches requiring review in this queue.</p>
                     </div>
                  ) : (
                    (activeTab === 'candidates' ? candidates : uncertain).map(match => (
                      <div key={match.match_id} className="timeline-row">
                        <div className={`timeline-marker ${match.status === 'pending' ? 'marker-yellow' : (match.status === 'accepted' ? 'marker-coral' : 'marker-blue')}`}>
                          {Math.round(match.similarity_score * 100)}%
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-top">
                            <span>Match ID: {match.match_id}</span>
                            <small>{new Date(match.created_at).toLocaleDateString()}</small>
                          </div>
                          <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                            <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 'bold' }}>AI MATCH EVIDENCE</span>
                            <h3 style={{ margin: '2px 0 0 0', fontSize: '16px' }}>Similarity: {(match.similarity_score * 100).toFixed(1)}%</h3>
                            <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Model: mir-v0.4.0</div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
                            <div style={{ background: 'var(--paper)', padding: '15px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                              <span style={{ color: 'var(--coral)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Lost Report</span>
                              <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{match.lost_report?.item_category || 'Unknown'}</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-soft)' }}>{match.lost_report?.description}</p>
                              {match.lost_report?.image_reference && (
                                <div style={{ marginTop: '10px', height: '100px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <img src={match.lost_report.image_reference} alt="Lost item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}
                            </div>
                            <div style={{ background: 'var(--paper)', padding: '15px', border: '1px solid var(--line)', borderRadius: '8px' }}>
                              <span style={{ color: 'var(--blue)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Found Item</span>
                              <h4 style={{ margin: '0 0 5px 0', fontSize: '14px' }}>{match.found_report?.item_category || 'Unknown'}</h4>
                              <p style={{ margin: 0, fontSize: '12px', color: 'var(--ink-soft)' }}>{match.found_report?.description}</p>
                              {match.found_report?.image_reference && (
                                <div style={{ marginTop: '10px', height: '100px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                                  <img src={match.found_report.image_reference} alt="Found item" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="timeline-actions" style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignSelf: 'center' }}>
                          {match.status === 'pending' && (
                            <>
                              <button className="button button-outline" onClick={() => handleUpdateCandidate(match.match_id, 'rejected')}>Reject</button>
                              <button className="button button-solid" onClick={() => handleUpdateCandidate(match.match_id, 'accepted')}>Accept</button>
                            </>
                          )}
                          {match.status !== 'pending' && (
                            <span style={{ fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>{match.status.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="timeline">
                  {reports.length === 0 ? (
                     <div className="empty-state">
                       <span>Queue Empty</span>
                       <h2>No Open Reports</h2>
                     </div>
                  ) : (
                    reports.map(report => (
                      <div key={report.report_id} className="timeline-row">
                        <div className={`timeline-marker ${report.report_type === 'lost' ? 'marker-coral' : 'marker-blue'}`}>
                          {report.report_type.toUpperCase()}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-top">
                            <span>Report ID: {report.report_id}</span>
                            <small>{new Date(report.created_at).toLocaleDateString()}</small>
                          </div>
                          <h3>{report.item_category}</h3>
                          <p>{report.description}</p>
                          <div style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '8px' }}>
                            Status: {report.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'items' && (
                <div className="timeline">
                  {items.length === 0 ? (
                     <div className="empty-state">
                       <span>Queue Empty</span>
                       <h2>No Returned Items</h2>
                     </div>
                  ) : (
                    items.map(item => (
                      <div key={item.item_instance_id} className="timeline-row">
                        <div className="timeline-marker marker-green">
                          DONE
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-top">
                            <span>Item ID: {item.item_instance_id}</span>
                            <small>{new Date(item.created_at).toLocaleDateString()}</small>
                          </div>
                          <h3>{item.item_category}</h3>
                          <p>{item.description}</p>
                          <div style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '8px' }}>
                            Resolved At: {item.resolved_at ? new Date(item.resolved_at).toLocaleDateString() : 'Pending'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
