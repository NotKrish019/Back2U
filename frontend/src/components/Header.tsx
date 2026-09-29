'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { UserRound, Menu, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from './Logo';
import AuthNav from './AuthNav';
import { useAuth } from '@/lib/firebase/AuthContext';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth <= 680);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setOpen(false); // Close on route change
  }, [pathname]);
  const { isAdmin } = useAuth();
  
  const nav = [
    ["Browse", "/search"],
    ["Hotspots", "/map"],
    ["My reports", "/my-reports"],
  ];
  
  if (isAdmin) {
    nav.push(["Admin", "/admin"]);
  }

  const desktopNav = (
    <nav className="main-nav desktop-nav">
      {nav.map(([label, href]) => (
        <Link key={href} href={href} className={pathname === href ? "nav-active" : ""}>
          {label}
        </Link>
      ))}
    </nav>
  );

  const mobileNav = (
    <AnimatePresence>
      {open && (
        <motion.nav 
          className="main-nav mobile-nav nav-open"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <motion.div
            initial="closed"
            animate="open"
            exit="closed"
            variants={{
              open: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
              closed: { transition: { staggerChildren: 0.05, staggerDirection: -1 } }
            }}
            style={{ display: 'flex', flexDirection: 'column' }}
          >
            {nav.map(([label, href]) => (
              <motion.div
                key={href}
                variants={{
                  open: { opacity: 1, x: 0 },
                  closed: { opacity: 0, x: -10 }
                }}
              >
                <Link href={href} className={pathname === href ? "nav-active" : ""} onClick={() => setOpen(false)}>
                  {label}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
  
  return (
    <motion.header 
      className="site-header"
      initial={{ y: -15, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="header-inner">
        <Logo />
        {mounted && (!isMobile ? desktopNav : mobileNav)}
        <div className="header-actions">
          <Link href="/search" className="header-find hover-lift">
            <span>Find an item</span>
            <ArrowRight size={14} className="find-arrow" />
          </Link>
          <AuthNav />
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Open navigation">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
    </motion.header>
  );
}

