"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Menu, X } from "lucide-react";
import AccountMenu from "./AccountMenu";
import { Wordmark } from "./brand/primitives";

const NAV_ITEMS = [
  { label: "Search", href: "/search" },
  { label: "Browse found", href: "/browse" },
  { label: "Report lost", href: "/report/lost" },
  { label: "Report found", href: "/report/found" },
  { label: "My reports", href: "/reports" },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

export default function Navigation() {
  const pathname = usePathname() || "/";
  const reduce = useReducedMotion();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on navigation and on Escape; lock page scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <header className="b2-nav" data-scrolled={scrolled || open}>
        <div className="b2-container b2-nav__inner">
          <Link href="/" aria-label="Back2U home" className="justify-self-start py-2">
            <Wordmark size={21} />
          </Link>

          <nav aria-label="Primary" className="b2-nav__links">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className="b2-nav__link" aria-current={active ? "page" : undefined}>
                  {active && (
                    <motion.span
                      layoutId="b2-nav-pill"
                      className="b2-nav__pill"
                      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="b2-nav__right">
            <AccountMenu />
            <button
              className="b2-nav__burger"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="b2-mobile-nav"
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="b2-mobile-nav"
            aria-label="Mobile"
            className="b2-sheet"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {NAV_ITEMS.map((item, i) => (
              <motion.div
                key={item.href}
                initial={reduce ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduce ? 0 : 0.04 * i + 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link href={item.href} className="b2-sheet__link" aria-current={isActive(pathname, item.href) ? "page" : undefined}>
                  {item.label}
                  <ArrowUpRight size={20} strokeWidth={1.4} />
                </Link>
              </motion.div>
            ))}
            <div className="mt-auto pt-10 flex flex-col gap-3">
              <span className="b2-label">Campus lost &amp; found</span>
              <Link href="/login" className="b2-btn b2-btn--ghost">Log in or create account</Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  );
}
