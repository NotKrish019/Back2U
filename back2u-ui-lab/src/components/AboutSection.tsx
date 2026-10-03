import Link from "next/link";

export default function AboutSection() {
  return (
    <section className="w-full border-b-2 border-[var(--color-retro-border)] bg-[#fef9f1] py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left: Large Editorial Title */}
          <div className="lg:col-span-5 space-y-6">
            <div className="font-['Space_Mono'] text-[12px] text-[#b90a5a] uppercase font-bold tracking-[0.04em]">
              [ 01 // CAMPUS_CONNECTION ]
            </div>
            
            <h2 className="font-['Newsreader'] text-[48px] md:text-[56px] leading-[1.1] tracking-tight text-[var(--color-retro-charcoal)] font-normal max-w-[400px]">
              A campus where lost things find <span className="italic text-[#b90a5a]">their way back 2 u.</span>
            </h2>
            
            <p className="font-['Work_Sans'] text-[15px] leading-[22px] text-[#594046]">
              back2u, the university lost & found platform
            </p>
          </div>

          {/* Right: Desktop Information Card */}
          <div className="lg:col-span-7 bg-[#FBF9F5] border-2 border-[var(--color-retro-border)] shadow-[5px_5px_0px_#1A1A1A]">
            <div className="bg-[#E2DDD5] px-4 py-2 border-b border-[var(--color-retro-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-retro-charcoal)]"></div>
                <span className="font-['Space_Mono'] text-[12px] text-[var(--color-retro-charcoal)] font-bold tracking-[0.04em]">
                  BACK2U / SYSTEM
                </span>
              </div>
              <span className="font-['Space_Mono'] text-[10px] text-[#8d7076] tracking-[0.02em]">
                [ READ_ONLY ]
              </span>
            </div>
            
            <div className="p-6 md:p-8 space-y-6 bg-[#F5F2EB]/40">
              <div className="inline-block px-2 py-0.5 bg-[#FFF2B2] border border-[var(--color-retro-border)] font-['Space_Mono'] text-[11px] font-bold tracking-[0.08em] uppercase text-[var(--color-retro-charcoal)]">
                BUILT FOR CAMPUS, BUILT TO RECONNECT
              </div>
              
              <p className="font-['Newsreader'] text-[24px] md:text-[28px] leading-[1.3] text-[var(--color-retro-charcoal)] font-medium">
                BACK2U is a university lost & found platform built to make losing something less stressful — and finding it again a little easier.
              </p>
              
              <p className="font-['Work_Sans'] text-[15px] leading-[24px] text-[#594046]">
                Whether you've lost something or found something that belongs to someone else, Back2U connects both sides and helps bring it back where it belongs.
              </p>
              
              <div className="pt-6 flex flex-wrap gap-4 border-t border-[var(--color-retro-border)]">
                <Link 
                  href="/report/lost" 
                  className="px-6 py-3 bg-[var(--color-hot-pink)] text-white font-['Space_Mono'] text-[11px] font-bold tracking-[0.08em] uppercase border border-[var(--color-retro-border)] shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] transition-all flex items-center gap-2"
                >
                  REPORT LOST <span className="text-[14px]">→</span>
                </Link>
                
                <Link 
                  href="/report/found" 
                  className="px-6 py-3 bg-[#FBF9F5] hover:bg-[#EAE5DE] text-[var(--color-retro-charcoal)] font-['Space_Mono'] text-[11px] font-bold tracking-[0.08em] uppercase border border-[var(--color-retro-border)] shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] transition-all flex items-center gap-2"
                >
                  REPORT FOUND <span className="text-[14px]">→</span>
                </Link>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </section>
  );
}
