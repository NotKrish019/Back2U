'use client';
import { Suspense } from 'react';
import ReportFlow from '@/components/report/ReportFlow';

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="b2-page b2-container pt-24"><span className="b2-label">Loading…</span></div>}>
      <ReportFlow type="found" />
    </Suspense>
  );
}
