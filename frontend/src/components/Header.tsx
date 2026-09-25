'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Search, UserRound, Menu, X } from 'lucide-react';
import { Logo } from './Logo';
import AuthNav from './AuthNav';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  
  const nav = [
    ["Browse", "/search"],
    ["Hotspots", "/map"],
    ["My reports", "/my-reports"],
  ];
  
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className={`main-nav ${open ? "nav-open" : ""}`}>
          {nav.map(([label, href]) => (
            <Link key={href} href={href} className={pathname === href ? "nav-active" : ""} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link href="/search" className="header-find">
            <Search size={16} />Find an item
          </Link>
          <AuthNav />
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Open navigation">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}
