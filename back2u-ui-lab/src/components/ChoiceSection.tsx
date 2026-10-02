import { ArrowRight } from 'lucide-react';

export default function ChoiceSection() {
  return (
    <section className="w-full relative px-6 py-24 md:py-32 bg-white/50 backdrop-blur-[18px] backdrop-saturate-[1.15] shadow-[0_20px_60px_rgba(61,49,91,0.06)] border-t border-transparent z-0">
      <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-8 items-start relative z-10">
        
        {/* LEFT COLUMN: INTRO */}
        <div className="flex flex-col pr-0 md:pr-12">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase text-accent-pink mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-pink"></span>
            YOUR NEXT MOVE
          </div>
          
          <h2 className="text-[clamp(45px,5vw,70px)] font-[800] leading-[1] tracking-[-0.04em] text-deep-plum mb-6" style={{ fontFamily: '"Syne", sans-serif' }}>
            Two paths.<br />
            <em className="text-accent-pink not-italic relative inline-block">
              One good feeling.
            </em>
          </h2>
          
          <p className="text-body-text max-w-[420px] text-[16px] md:text-[18px] font-medium leading-relaxed">
            Whether you're retracing your steps or picking up someone else's, Back2U keeps the next step simple.
          </p>
        </div>

        {/* RIGHT COLUMN: LIST */}
        <div className="flex flex-col w-full border-t border-lavender md:border-t-0 md:border-b border-b-lavender relative">
          {/* Top border for desktop to match main site aesthetic */}
          <div className="hidden md:block absolute top-0 left-0 w-full h-[1px] bg-lavender" />
          
          <button className="group flex items-center justify-between py-10 md:py-12 border-b border-lavender transition-all duration-300 hover:bg-sky/10 text-left w-full relative">
            <div className="flex items-start gap-8 md:gap-12 px-4 md:px-6">
              <span className="text-[11px] font-bold text-accent-pink mt-2">01</span>
              <div>
                <h3 className="text-[22px] md:text-[32px] font-[800] tracking-[-0.04em] text-deep-plum mb-1 transition-colors duration-300 group-hover:text-accent-pink" style={{ fontFamily: '"Syne", sans-serif' }}>
                  I LOST SOMETHING
                </h3>
                <p className="text-body-text text-[15px] font-medium">Find it</p>
              </div>
            </div>
            <div className="pr-4 md:pr-6">
              <ArrowRight className="text-accent-pink transition-transform duration-300 group-hover:translate-x-2" size={24} strokeWidth={2} />
            </div>
          </button>
          
          <button className="group flex items-center justify-between py-10 md:py-12 border-b border-lavender transition-all duration-300 hover:bg-sky/10 text-left w-full relative">
            <div className="flex items-start gap-8 md:gap-12 px-4 md:px-6">
              <span className="text-[11px] font-bold text-[#E6B033] mt-2">02</span>
              <div>
                <h3 className="text-[22px] md:text-[32px] font-[800] tracking-[-0.04em] text-deep-plum mb-1 transition-colors duration-300 group-hover:text-[#E6B033]" style={{ fontFamily: '"Syne", sans-serif' }}>
                  I FOUND SOMETHING
                </h3>
                <p className="text-body-text text-[15px] font-medium">Help return it</p>
              </div>
            </div>
            <div className="pr-4 md:pr-6">
              <ArrowRight className="text-[#E6B033] transition-transform duration-300 group-hover:translate-x-2" size={24} strokeWidth={2} />
            </div>
          </button>
        </div>
        
      </div>
    </section>
  );
}
