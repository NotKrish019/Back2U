'use client';
import Link from 'next/link';

export function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/" className={`logo ${dark ? "logo-dark" : ""}`} aria-label="Back2U home">
      <span>BACK</span><span className="logo-mark">2</span><span>U</span>
      <i />
    </Link>
  );
}
