"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      label: "STEP 01",
      title: "SHOW US THE ITEM",
      description: "Start with a quick photo. It doesn't have to be perfect.",
      badge: "[REPORT]",
      bgColor: "bg-[#E4DDF7]", // pastel-lavender
      image: "/mocks/workflow_step1.jpg"
    },
    {
      label: "STEP 02",
      title: "TELL US WHAT YOU REMEMBER",
      description: "Add a place, a date, a colour — anything that helps.",
      badge: "[IMAGE + TEXT]",
      bgColor: "bg-[#FFD6BE]", // pastel-peach
      image: "/mocks/workflow_step2.jpg"
    },
    {
      label: "STEP 03",
      title: "REVIEW POSSIBLE MATCHES",
      description: "A short list of possible matches, explained like a human.",
      badge: "[REVIEW]",
      bgColor: "bg-[#C4EED0]", // pastel-mint
      image: "/mocks/workflow_step3.jpg"
    }
  ];

  const [isManualScroll, setIsManualScroll] = useState(false);
  const manualScrollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll) return;

      const focusLine = window.innerHeight * 0.4; // 40% from top
      let closestIdx = activeStep;
      let minDistance = Infinity;

      steps.forEach((_, idx) => {
        const el = document.getElementById(`workflow-step-${idx}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          // Calculate distance from the center of the element to the focus line
          const elCenter = rect.top + rect.height / 2;
          const distance = Math.abs(elCenter - focusLine);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestIdx = idx;
          }
        }
      });

      if (closestIdx !== activeStep) {
        setActiveStep(closestIdx);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Trigger once on mount
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeStep, isManualScroll, steps.length]);

  const handleStepClick = (idx: number) => {
    setActiveStep(idx);
    setIsManualScroll(true);
    
    if (manualScrollTimeout.current) {
      clearTimeout(manualScrollTimeout.current);
    }
    
    // Clear manual scroll lock after animation finishes
    manualScrollTimeout.current = setTimeout(() => {
      setIsManualScroll(false);
    }, 800);

    const el = document.getElementById(`workflow-step-${idx}`);
    if (el) {
      // Calculate position to center the element near the focus line (40% from top)
      const rect = el.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetY = scrollTop + rect.top - (window.innerHeight * 0.4) + (rect.height / 2);
      
      window.scrollTo({
        top: targetY,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="w-full bg-[#FBF9F5] py-20 border-b-2 border-[var(--color-retro-border)] relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <div className="font-['Space_Mono'] text-[11px] text-[#b90a5a] uppercase font-bold tracking-[0.08em] mb-3">
            [ HOW IT WORKS // SYSTEM PROCESS ]
          </div>
          <h2 className="font-['Syne'] text-[40px] md:text-[48px] leading-[1.1] font-bold text-[var(--color-retro-charcoal)] max-w-2xl uppercase tracking-tight">
            Less searching.<br/>More finding.
          </h2>
          <p className="font-['Work_Sans'] text-[16px] leading-[26px] text-[#594046] max-w-md mt-4">
            Back2U uses the details you remember to narrow down the things you don't.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Panel - Sticky Viewer */}
          <div className="lg:col-span-5 bg-[#FBF9F5] border-2 border-[var(--color-retro-border)] shadow-[5px_5px_0px_#1A1A1A] sticky top-28 z-10 hidden lg:block">
            <div className="bg-[#E2DDD5] px-4 py-2 border-b-2 border-[var(--color-retro-border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#FF3E72] border border-[var(--color-retro-border)]"></div>
                <div className="w-3 h-3 rounded-full bg-[#FFD6BE] border border-[var(--color-retro-border)]"></div>
                <div className="w-3 h-3 rounded-full bg-[#C4EED0] border border-[var(--color-retro-border)]"></div>
                <span className="ml-2 font-['Space_Mono'] text-[11px] font-bold text-[var(--color-retro-charcoal)] tracking-widest">BACK2U_WORKFLOW.EXE [v2.0]</span>
              </div>
              <span className="px-1.5 py-0.5 bg-[#C4EED0] border border-[var(--color-retro-border)] font-['Space_Mono'] text-[9px] uppercase font-bold text-[var(--color-retro-charcoal)] tracking-widest">ACTIVE</span>
            </div>
            
            <div className="p-4 bg-[#F5F2EB]">
              <div className="relative border-2 border-[var(--color-retro-border)] overflow-hidden aspect-square bg-[#EBE7DF]">
                {steps.map((step, idx) => (
                  <motion.img
                    key={idx}
                    src={step.image}
                    alt={step.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: activeStep === idx ? 1 : 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  />
                ))}
                

              </div>
              
              <div className="mt-4 p-3 bg-[#FBF9F5] border border-[var(--color-retro-border)]">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-['Syne'] text-[16px] text-[var(--color-retro-charcoal)] font-bold uppercase tracking-tight">BACK2U WORKFLOW</div>
                    <div className="font-['Space_Mono'] text-[11px] text-[#594046] tracking-wider uppercase">LIVE PROCESS</div>
                  </div>
                  <div className="px-3 py-1.5 bg-[#FF3E72] text-white font-['Space_Mono'] text-[10px] uppercase border border-[var(--color-retro-border)] shadow-[1px_1px_0px_#1A1A1A] tracking-widest">
                    SYSTEM READY
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panels - Scrollable Content */}
          <div className="lg:col-span-7 flex flex-col gap-6 relative z-0">
            {steps.map((step, idx) => (
              <motion.div
                key={idx}
                id={`workflow-step-${idx}`}
                className="relative"
                initial="hidden"
                whileInView="visible"
                viewport={{ margin: "-20% 0px -20% 0px", amount: "some" }}
              >
                <div
                  onClick={() => handleStepClick(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleStepClick(idx);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Activate workflow step ${idx + 1}`}
                  className={`${step.bgColor} border-2 border-[var(--color-retro-border)] p-6 shadow-[4px_4px_0px_#1A1A1A] transition-all duration-300 relative cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[#FF3E72]`}
                  style={{
                    transform: activeStep === idx ? 'translateX(-8px)' : 'translateX(0)',
                    boxShadow: activeStep === idx ? '6px 6px 0px #1A1A1A' : '4px 4px 0px #1A1A1A',
                    opacity: activeStep === idx ? 1 : 0.6,
                  }}
                >
                
                {/* Mobile inline image (hidden on desktop) */}
                <div className="lg:hidden mb-6 relative border-2 border-[var(--color-retro-border)] aspect-video overflow-hidden">
                   <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-['Space_Mono'] text-[11px] tracking-widest uppercase font-bold px-2 py-1 bg-[#FBF9F5] border border-[var(--color-retro-border)]">
                      {step.label}
                    </span>
                    <span className="font-['Syne'] text-[20px] md:text-[24px] text-[var(--color-retro-charcoal)] font-bold tracking-tight uppercase">
                      {step.title}
                    </span>
                  </div>
                  <span className="font-['Space_Mono'] text-[10px] px-2 py-1 bg-white border border-[var(--color-retro-border)] text-[#b90a5a] font-bold tracking-widest">
                    {step.badge}
                  </span>
                </div>
                <p className="font-['Work_Sans'] text-[16px] text-[var(--color-retro-charcoal)] leading-relaxed font-medium max-w-lg">
                  {step.description}
                </p>
                </div>
              </motion.div>
            ))}
          </div>
          
        </div>
      </div>
    </section>
  );
}
