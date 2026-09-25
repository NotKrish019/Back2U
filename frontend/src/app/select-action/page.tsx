'use client';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { SectionLabel, PageTop } from '@/components/ManusUI';

export default function SelectActionPage() {
  const router = useRouter();
  
  return (
    <div className="page-shell select-action-page">
      <PageTop 
        eyebrow="Start here" 
        title={<>What brings<br /><em>you in?</em></>} 
        intro="Choose the path that matches your moment. You can always change direction." 
      />
      <section className="choice-section container-wide">
        <div className="choice-intro">
          <SectionLabel>Two simple paths</SectionLabel>
          <h2>Good things<br /><em>come back.</em></h2>
          <p>Back2U keeps the useful bit upfront: whether you’re looking for something or helping it get home.</p>
        </div>
        <div className="choice-list">
          <button className="choice-row choice-row-coral" onClick={() => router.push("/search")}>
            <span className="choice-number">01</span>
            <div>
              <h3>I lost something</h3>
              <p>Search campus reports with a photo, description, or both.</p>
            </div>
            <ArrowUpRight className="choice-arrow" size={22} />
          </button>
          <button className="choice-row choice-row-yellow" onClick={() => router.push("/report?type=found")}>
            <span className="choice-number">02</span>
            <div>
              <h3>I found something</h3>
              <p>Report it with the details that help the right person recognise it.</p>
            </div>
            <ArrowUpRight className="choice-arrow" size={22} />
          </button>
        </div>
      </section>
    </div>
  );
}
