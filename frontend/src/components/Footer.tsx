'use client';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div>
          <Logo dark />
          <p className="footer-note">Lost things find their way<br />back to their people.</p>
        </div>
        <div className="footer-links">
          <div>
            <span>Explore</span>
            <Link href="/search">Find an item</Link>
            <Link href="/report?type=found">Report found</Link>
            <Link href="/search">Browse reports</Link>
          </div>
          <div>
            <span>Account</span>
            <Link href="/my-reports">My reports</Link>
            <Link href="/settings">Profile & settings</Link>
            <Link href="/login">Sign in</Link>
          </div>
        </div>
        <div className="footer-reassurance">
          <ShieldCheck size={18} />
          <p>Made for campus.<br />Private by default.</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 BACK2U</span>
        <span>
          <Link href="/terms">Terms</Link> <b>·</b> <Link href="/privacy">Privacy</Link> <b>·</b> Support
        </span>
        <span className="footer-social">@back2u.campus</span>
      </div>
    </footer>
  );
}
