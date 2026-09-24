import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/firebase/AuthContext';
import CookieBanner from '@/components/CookieBanner';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

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
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <div className="app">
            <Header />
            <main>
              {children}
            </main>
            <Footer />
          </div>
          <CookieBanner />
        </AuthProvider>
      </body>
    </html>
  );
}
