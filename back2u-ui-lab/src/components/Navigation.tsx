import Link from "next/link";
import {
  FileWarning,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import AccountMenu from "./AccountMenu";

const NAV_ITEMS = [
  { id: "report-lost", label: "Report Lost", href: "/report/lost", icon: <FileWarning size={16} /> },
  { id: "report-found", label: "Report Found", href: "/report/found", icon: <FileCheck size={16} /> },
  { id: "reports", label: "My Reports", href: "/reports", icon: <ClipboardList size={16} /> },
];

export default function Navigation() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="w-full bg-[var(--color-hot-pink)] text-[var(--color-on-primary)] border-b border-[var(--color-retro-border)]">
        <div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between font-mono text-[12px] tracking-[0.04em]">
          <div className="flex items-center gap-2">
            <span className="inline-block px-1.5 py-0.5 bg-[var(--color-retro-charcoal)] text-white font-mono text-[11px] font-bold tracking-[0.08em] uppercase border border-[var(--color-retro-border)]">
              Campus lost & found
            </span>
            <span>EST. 2026</span>
          </div>
        </div>
      </div>
      <div className="w-full bg-[var(--color-surface-canvas)]/95 backdrop-blur-md border-b border-[var(--color-retro-border)]">
        <div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            {/* LOGO */}
            <Link 
              href="/" 
              className="relative inline-flex items-center gap-[1px] text-deep-purple text-[19px] font-[800] tracking-[-0.09em] flex-shrink-0" 
              style={{ fontFamily: '"Syne", sans-serif' }}
              aria-label="Back2U home"
            >
              <span>BACK</span>
              <span className="text-accent-pink text-[21px] -rotate-8 inline-block">2</span>
              <span>U</span>
              <i className="w-[5px] h-[5px] ml-[5px] mt-[15px] bg-accent-pink rounded-full inline-block" />
            </Link>
            
            {/* MAIN NAV (Stitch Styled) */}
            <nav className="hidden xl:flex items-center gap-6 font-sans text-[13px]">
              {NAV_ITEMS.map((item) => (
                <Link 
                  key={item.id} 
                  href={item.href}
                  className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] transition-colors py-1 flex items-center gap-2"
                >
                  <span className="flex items-center justify-center opacity-80">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* HEADER ACTIONS (Stitch Styled) */}
          <div className="flex items-center gap-4">
            <AccountMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
