'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, CircleHelp } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';
import { api, ReportOut } from '../../services/api';

export default function MyReportsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportOut[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      api.getUserReports()
        .then((data) => {
          setReports(data);
        })
        .catch((err) => {
          console.error(err);
          setError("Failed to load reports. Please try again.");
        })
        .finally(() => {
          setDataLoading(false);
        });
    }
  }, [user]);

  if (authLoading || !user || dataLoading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading your reports...</div>;
  }

  const activeCount = reports.filter(r => r.status !== 'closed' && r.status !== 'returned').length;
  const matchesCount = reports.filter(r => r.status === 'matched').length;
  const returnedCount = reports.filter(r => r.status === 'returned').length;

  return (
    <div className="page-shell reports-page">
      <PageTop 
        eyebrow="Your activity" 
        title={<>The things you’ve<br /><em>put in motion.</em></>} 
        intro="Keep an eye on your reports, matches, and returns in one calm place." 
        action={<Button onClick={() => router.push("/report?type=found")} variant="solid" icon={<ArrowRight size={16} />}>New report</Button>} 
      />
      <section className="reports-summary container-wide">
        <div><span>ACTIVE REPORTS</span><b>{activeCount}</b></div>
        <div><span>POSSIBLE MATCHES</span><b>{matchesCount}</b></div>
        <div><span>RETURNED</span><b>{returnedCount}</b></div>
      </section>
      
      {error && (
        <section className="container-wide" style={{ color: 'var(--coral)', marginBottom: '2rem' }}>
          <p>{error}</p>
        </section>
      )}

      <section className="timeline container-wide">
        {reports.length === 0 && !error ? (
          <div className="empty-state" style={{ padding: '4rem 0', textAlign: 'center' }}>
            <span>NO REPORTS YET</span>
            <h2>Nothing on the radar.</h2>
            <p>Lost something or found an item? Start a report to track it here.</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
               <Button onClick={() => router.push("/search")} variant="outline">Search for a lost item</Button>
               <Button onClick={() => router.push("/report?type=found")} variant="solid">Report a found item</Button>
            </div>
          </div>
        ) : (
          reports.map((report, i) => {
            const isFound = report.report_type === 'found';
            const color = isFound ? 'yellow' : (report.status === 'returned' || report.status === 'closed' ? 'blue' : 'coral');
            
            return (
              <button className="timeline-row" key={report.report_id} onClick={() => router.push(`/item/${report.report_id}`)}>
                <div className={`timeline-marker marker-${color}`}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </div>
                <div className="timeline-content">
                  <div className="timeline-top">
                    <span style={{ textTransform: 'uppercase' }}>{report.report_type} REPORT</span>
                    <small>{new Date(report.created_at).toLocaleDateString()}</small>
                  </div>
                  <h3>{report.item_category || "Untitled Item"}</h3>
                  <p>{report.location || "Unknown location"}</p>
                  <div className="timeline-status">
                    <span className={`status-line status-${color}`} />
                    <span style={{ textTransform: 'capitalize' }}>{report.status}</span>
                  </div>
                </div>
                <ArrowUpRight size={18} />
              </button>
            );
          })
        )}
      </section>
      <div className="reports-help container-wide">
        <div>
          <CircleHelp size={20} />
          <h3>Waiting on something?</h3>
          <p>We’ll let you know when a report lines up with your details.</p>
        </div>
        <button onClick={() => router.push("/settings")}>Manage notifications <ArrowRight size={16} /></button>
      </div>
    </div>
  );
}
