"use client";

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SectionLabel } from '../report/lost/ManusUILab';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Test mode bypass for Playwright
    if (typeof window !== 'undefined' && window.localStorage.getItem('TEST_MODE') === 'true') {
      return;
    }

    if (!loading) {
      if (!user && pathname !== '/staff/login') {
        router.push('/staff/login');
      }
    }
  }, [user, loading, router, pathname]);

  // For testing bypass
  const isTestMode = typeof window !== 'undefined' && window.localStorage.getItem('TEST_MODE') === 'true';

  if (loading && !isTestMode) {
    return (
      <main className="page-shell">
        <div className="container-wide" style={{ textAlign: 'center', padding: '100px 0' }}>
          <div className="orbit-ring" style={{ width: '40px', height: '40px', margin: '0 auto', position: 'relative' }}></div>
          <p style={{ marginTop: '20px', color: 'var(--ink-soft)' }}>Verifying credentials...</p>
        </div>
      </main>
    );
  }

  if (pathname === '/staff/login') {
    return <>{children}</>;
  }

  if (!isAdmin && !isTestMode) {
    return (
      <main className="page-shell">
        <div className="container-wide" style={{ textAlign: 'center', padding: '100px 0' }}>
          <SectionLabel>Access Denied</SectionLabel>
          <h1 style={{ marginTop: '20px' }}>Staff Only</h1>
          <p style={{ marginTop: '20px', color: 'var(--ink-soft)' }}>You do not have permission to view the Admin Operations Center.</p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
