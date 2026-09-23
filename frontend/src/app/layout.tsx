import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { Search } from 'lucide-react';
import localFont from 'next/font/local';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/lib/firebase/AuthContext';
import AuthNav from '@/components/AuthNav';
import CookieBanner from '@/components/CookieBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

const coolvetica = localFont({
  src: [
    {
      path: './fonts/Coolvetica Rg.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/Coolvetica Rg It.otf',
      weight: '400',
      style: 'italic',
    }
  ],
  variable: '--font-coolvetica',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Back2U',
  description: 'Lost & Found, Together.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${coolvetica.variable}`}>
        <AuthProvider>
          <header style={{
          backgroundColor: 'var(--nav-purple)',
          color: 'var(--white)',
          padding: '1.25rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.85rem',
          fontWeight: 500,
          letterSpacing: '0.02em',
          position: 'relative',
          zIndex: 50
        }}>
          <div style={{ fontFamily: 'var(--font-coolvetica)', fontWeight: 400, fontSize: '1.2rem', letterSpacing: '0.05em' }}>
            <Link href="/">BACK2U <span style={{ color: 'var(--accent-red)' }}>•</span></Link>
          </div>
          
          <nav style={{ display: 'flex', gap: '2.5rem', opacity: 0.8 }}>
            <Link href="/search" style={{ transition: 'opacity 0.2s' }} className="hover:opacity-100">Browse</Link>
            <Link href="/search" style={{ transition: 'opacity 0.2s' }} className="hover:opacity-100">Find an Item</Link>
            <Link href="/report?type=found" style={{ transition: 'opacity 0.2s' }} className="hover:opacity-100">Report Found</Link>
          </nav>

          <AuthNav />
        </header>

        <main style={{ flex: 1 }}>
          {children}
        </main>

        <footer style={{
          backgroundColor: 'var(--nav-purple)',
          color: 'rgba(255,255,255,0.5)',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginTop: '4rem'
        }}>
          <div>BACK2U</div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <Link href="/terms" style={{ transition: 'opacity 0.2s', textDecoration: 'none', color: 'inherit' }} className="hover:opacity-100 hover:text-white">Terms & Conditions</Link>
            <Link href="/privacy" style={{ transition: 'opacity 0.2s', textDecoration: 'none', color: 'inherit' }} className="hover:opacity-100 hover:text-white">Privacy Policy</Link>
            <div>LOST & FOUND, TOGETHER</div>
          </div>
        </footer>
        <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
