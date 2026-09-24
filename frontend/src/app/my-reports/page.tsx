'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ArrowRight, ArrowUpRight, CircleHelp } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';

export default function MyReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading your reports...</div>;
  }

  const reports = [
    { type: "LOST REPORT", title: "Black canvas backpack", date: "Started today · West Quad", status: "2 possible matches", color: "coral" },
    { type: "FOUND REPORT", title: "Silver water bottle", date: "Submitted yesterday · Gym", status: "Waiting for a match", color: "yellow" },
    { type: "LOST REPORT", title: "Blue knit scarf", date: "Closed 12 Sep · North Hall", status: "Returned to owner", color: "blue" }
  ];

  return (
    <div className="page-shell reports-page">
      <PageTop 
        eyebrow="Your activity" 
        title={<>The things you’ve<br /><em>put in motion.</em></>} 
        intro="Keep an eye on your reports, matches, and returns in one calm place." 
        action={<Button onClick={() => router.push("/report?type=found")} variant="solid" icon={<ArrowRight size={16} />}>New report</Button>} 
      />
      <section className="reports-summary container-wide">
        <div><span>ACTIVE REPORTS</span><b>2</b></div>
        <div><span>POSSIBLE MATCHES</span><b>2</b></div>
        <div><span>RETURNED</span><b>1</b></div>
      </section>
      <section className="timeline container-wide">
        {reports.map((report, i) => (
          <button className="timeline-row" key={report.title} onClick={() => router.push(`/item/${i + 1}`)}>
            <div className={`timeline-marker marker-${report.color}`}>
              <span>{String(i + 1).padStart(2, "0")}</span>
            </div>
            <div className="timeline-content">
              <div className="timeline-top">
                <span>{report.type}</span>
                <small>{i === 0 ? "Just now" : i === 1 ? "Yesterday" : "12 Sep"}</small>
              </div>
              <h3>{report.title}</h3>
              <p>{report.date}</p>
              <div className="timeline-status">
                <span className={`status-line status-${report.color}`} />
                {report.status}
              </div>
            </div>
            <ArrowUpRight size={18} />
          </button>
        ))}
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
