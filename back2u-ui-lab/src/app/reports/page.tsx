'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import { X, ArrowUpRight } from 'lucide-react';
import Image from 'next/image';

const DEMO_REPORTS = [
  {
    id: "rep_901a",
    type: "LOST",
    badge: "#1 MATCH",
    badgeColor: "bg-pastel-mint",
    item: "Silver Chilly's Water Bottle",
    description: "Has a 'Save the turtles' sticker on the bottom left. Dented cap.",
    location: "Main Library, 2nd Floor",
    date: "24 Oct 2026, 14:30",
    status: "MATCHED",
    statusColor: "text-primary",
    image: "https://lh3.googleusercontent.com/aida/AEtjO1Wrl_DTtqJ02vHL12-wVbjmOkLmxwSkah1nviqHaNGCna4sEqkSlM_WFC-4FQxS59mGMKvKWpoOPSLNrQY-6pJRR8yGMQ9Hb9c-H_rh3exf6VZqmTTnsBVo-8fgANKOQWxFmp5aNzNMP4RSC6R-uxWhuW8x3r4DFkqu2LMz213dmKhHv1-NOd_WpsieBHayFJFOSkmMrIOKATRDLFDgRbd0AzkMj_ocIhpL93-cUcHgwfHTOk1iokj4FLkg"
  },
  {
    id: "rep_432b",
    type: "FOUND",
    badge: "PENDING",
    badgeColor: "bg-pastel-yellow",
    item: "Black Canvas Backpack",
    description: "North Face backpack with a red keychain. Contains a notebook.",
    location: "Student Union, Cafe",
    date: "23 Oct 2026, 09:15",
    status: "OPEN",
    statusColor: "text-retro-charcoal",
    image: "https://lh3.googleusercontent.com/aida/AEtjO1UoZUwrxTd9H_myM7HcWn2wlLMrothIIQRSK5jaCxT45NXStTNQQ4VDHMtVuaPdqs9-lB6B7hD4E369Ddaue5SeAqluWh8CncSfWoGEpjLagkTQVYZwd9iwBa6REr4tBgkw62ebegHJulhUun7t5Ho_H8h0XYEIHiAy3DHzdYRP0n0V9gprcwfxslFZMQkQS0qy-Zoz5X7W6KkJ0OCEfTzcyJH9ySNlitYficjwZPUTwuj6MkxDvjyGmKBx"
  },
  {
    id: "rep_112c",
    type: "LOST",
    badge: "RETURNED",
    badgeColor: "bg-surface-sand",
    item: "Apple AirPods Pro",
    description: "In a blue silicone case. Right earbud is slightly scratched.",
    location: "Engineering Building, Room 402",
    date: "20 Oct 2026, 11:00",
    status: "CLOSED",
    statusColor: "text-on-surface-variant",
    image: null
  }
];

export default function MyReportsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      {/* Background Shell */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <GlobalMeshBackground />
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px]"></div>
      </div>

      <div className="w-full relative py-12 md:py-24 min-h-[70vh]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b-2 border-retro-border pb-6">
            <div>
              <div className="font-label-code text-label-code text-primary uppercase font-bold tracking-widest mb-1 font-mono">
                [ SYS_REPORT_DB // USER_ACTIVITY ]
              </div>
              <h1 className="font-display-hero text-headline-lg md:text-[44px] font-bold text-retro-charcoal mt-2 uppercase font-mono">
                My Reports
              </h1>
            </div>
            <p className="font-sans text-body-md text-on-surface-variant max-w-sm mt-4 md:mt-0 leading-relaxed font-mono">
              Keep an eye on your reports, matches, and returns in one calm place.
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 font-mono">
            {DEMO_REPORTS.map((report) => (
              <motion.div
                key={report.id}
                layoutId={`card-${report.id}`}
                onClick={() => setSelectedId(report.id)}
                className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform cursor-pointer relative"
              >
                <div>
                  <div className="bg-window-bar-gray px-3 py-1.5 border-b-2 border-retro-border flex items-center justify-between text-[11px]">
                    <span className="font-bold text-retro-charcoal uppercase tracking-widest">{report.type} REPORT</span>
                    <span className={`px-2 py-0.5 border border-retro-border font-bold text-retro-charcoal ${report.badgeColor}`}>
                      {report.badge}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="text-[20px] font-bold text-retro-charcoal mb-2 leading-tight">
                      {report.item}
                    </h3>
                    <p className="text-[13px] text-on-surface-variant mb-4 leading-relaxed h-10 overflow-hidden line-clamp-2">
                      {report.description}
                    </p>
                    <div className="space-y-2 pt-4 border-t border-retro-border/40 text-[11px]">
                      <div className="flex items-center gap-2 text-retro-charcoal">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        <span className="font-bold uppercase tracking-wider">{report.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant">
                        <span className="w-1.5 h-1.5 bg-retro-charcoal rounded-full"></span>
                        <span className="uppercase tracking-wider">{report.date}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-2.5 bg-surface-canvas border-t-2 border-retro-border flex justify-between items-center text-[10px] text-retro-charcoal font-bold tracking-widest uppercase">
                  <span>SYS: {report.status}</span>
                  <ArrowUpRight size={14} className="opacity-50" />
                </div>
              </motion.div>
            ))}
          </div>

          {DEMO_REPORTS.length === 0 && (
            <div className="w-full bg-surface-canvas border-2 border-retro-border p-12 text-center shadow-[4px_4px_0px_#1A1A1A]">
              <div className="text-primary mb-4 font-mono uppercase tracking-widest font-bold text-sm">[ DB_EMPTY ]</div>
              <h2 className="text-3xl font-bold font-mono text-retro-charcoal mb-4">Nothing on the radar.</h2>
              <p className="text-on-surface-variant font-mono mb-8">Lost something or found an item? Start a report to track it here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Modal State */}
      <AnimatePresence>
        {selectedId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedId(null)}
              className="absolute inset-0 bg-retro-charcoal/40 backdrop-blur-sm"
            />
            
            {DEMO_REPORTS.filter(r => r.id === selectedId).map(report => (
              <motion.div
                key="modal"
                layoutId={`card-${report.id}`}
                className="bg-surface border-2 border-retro-border shadow-[8px_8px_0px_#1A1A1A] flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden relative z-10 font-mono"
              >
                {/* Modal Header */}
                <div className="bg-window-bar-gray px-4 py-3 border-b-2 border-retro-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-hot-pink border border-retro-border"></div>
                    <div className="w-3 h-3 rounded-full bg-pastel-yellow-gold border border-retro-border"></div>
                    <div className="w-3 h-3 rounded-full bg-pastel-mint border border-retro-border"></div>
                    <span className="ml-2 font-bold text-[12px] text-retro-charcoal tracking-widest uppercase">REPORT_DETAIL_VIEW.EXE</span>
                  </div>
                  <button onClick={() => setSelectedId(null)} className="hover:bg-retro-border hover:text-white transition-colors p-1 border border-transparent">
                    <X size={16} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-0 flex flex-col md:flex-row bg-surface-canvas">
                  
                  {/* Left Column (Image if exists) */}
                  <div className={`border-r-2 border-retro-border ${report.image ? 'w-full md:w-1/2' : 'hidden'}`}>
                    <div className="h-48 md:h-full w-full bg-surface-warm-grey relative p-4 flex items-center justify-center">
                      <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] mix-blend-overlay pointer-events-none"></div>
                      {report.image ? (
                        <div className="w-full h-full border-2 border-retro-border relative overflow-hidden shadow-[4px_4px_0px_#1A1A1A]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={report.image} alt={report.item} className="object-cover w-full h-full" />
                        </div>
                      ) : (
                        <div className="font-mono text-sm text-retro-charcoal/50 uppercase tracking-widest">[ NO_IMAGE_DATA ]</div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (Details) */}
                  <div className={`p-6 md:p-8 flex-1 flex flex-col ${!report.image ? 'md:w-full' : ''}`}>
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-1 bg-surface border-2 border-retro-border text-[10px] font-bold text-retro-charcoal uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A]">
                          {report.type} REPORT
                        </span>
                        <span className={`px-2 py-1 border-2 border-retro-border text-[10px] font-bold text-retro-charcoal uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] ${report.badgeColor}`}>
                          {report.badge}
                        </span>
                      </div>
                      <h2 className="text-3xl md:text-4xl font-bold text-retro-charcoal leading-tight mb-4">
                        {report.item}
                      </h2>
                      <p className="text-base text-on-surface-variant leading-relaxed">
                        {report.description}
                      </p>
                    </div>

                    <div className="space-y-4 pt-6 border-t-2 border-retro-border/30 mt-auto">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">[ LOCATION_DATA ]</div>
                        <div className="text-sm font-bold text-retro-charcoal uppercase">{report.location}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">[ TIMESTAMP ]</div>
                        <div className="text-sm font-bold text-retro-charcoal uppercase">{report.date}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">[ SYSTEM_STATUS ]</div>
                        <div className={`text-sm font-bold uppercase ${report.statusColor}`}>{report.status}</div>
                      </div>
                    </div>
                    
                    <div className="mt-8 pt-6 border-t-2 border-retro-border/30 flex justify-end gap-4">
                      <button className="px-5 py-2.5 bg-surface-sand text-retro-charcoal border-2 border-retro-border font-bold text-[12px] uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:bg-surface-warm-grey transition-colors cursor-pointer">
                        Edit Report
                      </button>
                      <button className="px-5 py-2.5 bg-hot-pink text-white border-2 border-retro-border font-bold text-[12px] uppercase tracking-widest shadow-[2px_2px_0px_#1A1A1A] hover:-translate-y-0.5 transition-transform cursor-pointer">
                        Take Action
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

    </>
  );
}
