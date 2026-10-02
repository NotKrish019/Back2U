import Link from "next/link";
import {
  Search,
  FileWarning,
  FileCheck,
  ClipboardList,
} from "lucide-react";
import { LimelightNav } from "./ui/limelight-nav";

const NAV_ITEMS = [
  { id: "search", label: "Search", href: "/search", icon: <Search /> },
  { id: "report-lost", label: "Report Lost", href: "/report/lost", icon: <FileWarning /> },
  { id: "report-found", label: "Report Found", href: "/report/found", icon: <FileCheck /> },
  { id: "reports", label: "My Reports", href: "/reports", icon: <ClipboardList /> },
];

export default function Navigation() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-deep-purple/10 w-full transition-colors">
      <div className="w-[min(1360px,calc(100%-80px))] mx-auto min-h-[76px] flex items-center justify-between gap-[32px]">
        
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
        
        {/* MAIN NAV (LIMELIGHT) */}
        <div className="ml-auto flex items-center gap-[30px] overflow-x-auto no-scrollbar">
          <LimelightNav items={NAV_ITEMS} className="bg-transparent border-none shadow-none rounded-none h-[76px]" />
        </div>

        {/* HEADER ACTIONS (Matching Main Website) */}
        <div className="flex items-center gap-[14px]">
          {/* Find an item */}
          <Link href="/search" className="hidden md:inline-flex items-center gap-[8px] px-[13px] py-[10px] border border-deep-purple/15 rounded-full text-deep-purple text-[13px] transition-colors duration-250 hover:bg-lavender hover:border-deep-purple group">
            <span>Find an item</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-250 group-hover:translate-x-[3px] group-hover:-translate-y-[3px]">
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          </Link>

          {/* Profile (AuthNav mock) */}
          <Link href="/profile" className="flex items-center gap-[7px] p-[5px] bg-transparent text-[10px] text-deep-purple" style={{ fontFamily: '"DM Mono", monospace' }}>
            <span className="grid place-items-center w-[29px] h-[29px] rounded-full bg-deep-purple text-white">
              ME
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
