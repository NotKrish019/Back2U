"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';

const ProgressIndicator = ({ activeStep }: { activeStep: number }) => {
  return (
    <div className="flex items-center w-full max-w-2xl mt-4 mb-4 lg:mb-6 overflow-hidden">
      {[0, 1, 2, 3, 4, 5, 6].map((stepIdx) => {
        const isCompleted = activeStep > stepIdx;
        const isActive = activeStep === stepIdx;
        
        return (
          <React.Fragment key={stepIdx}>
            <motion.div 
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-[1.5px] font-['Space_Mono'] text-[11px] font-bold tracking-wider relative z-10 cursor-pointer"
              animate={{
                borderColor: isActive || isCompleted ? 'var(--color-retro-border)' : 'var(--color-outline)',
                backgroundColor: isActive ? 'var(--color-primary)' : isCompleted ? 'white' : 'var(--color-surface-sand)',
                color: isActive ? 'white' : isCompleted ? 'var(--color-primary)' : 'var(--color-outline)',
                scale: isActive ? 1.1 : 1
              }}
              style={{
                boxShadow: isActive || isCompleted ? '2px 2px 0px var(--color-retro-border)' : 'none'
              }}
              transition={{ duration: 0.3 }}
            >
              0{stepIdx + 1}
            </motion.div>
            
            {stepIdx < 6 && (
              <div className="flex-1 min-w-[20px] h-[2px] mx-1 bg-[var(--color-window-bar-gray)] relative overflow-hidden rounded-full">
                <motion.div 
                  className="absolute top-0 left-0 h-full bg-[var(--color-primary)]"
                  initial={false}
                  animate={{ width: activeStep > stepIdx ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  const steps = [
    {
      label: "01. MULTIMODAL INPUT",
      title: "User Query",
      badge: "[IMAGE + TEXT + CONTEXT]",
      description: "Image + text + context enter Back2U.",
      bgColor: "bg-[#E4DDF7]", // pastel-lavender
      image: "/mocks/workflow_step1.jpg"
    },
    {
      label: "02. OBJECT PERCEPTION",
      title: "Item Understanding",
      badge: "[DETECTION + SEGMENTATION]",
      description: "Object detection & segmentation isolate the item.",
      bgColor: "bg-[#FFD6BE]", // pastel-peach
      image: "/mocks/workflow_step2.jpg"
    },
    {
      label: "03. VISUAL RETRIEVAL",
      title: "Visual Representation",
      badge: "[DINOv2 + METRIC LEARNING]",
      description: "DINOv2 + metric learning capture fine-grained visual features.",
      bgColor: "bg-[#C4EED0]", // pastel-mint
      image: "/mocks/workflow_step3.jpg"
    },
    {
      label: "04. MULTIMODAL ALIGNMENT",
      title: "Image + Text Understanding",
      badge: "[CROSS-MODAL EVIDENCE]",
      description: "Visual and textual evidence are aligned for multimodal retrieval.",
      bgColor: "bg-[#CDE4FE]", // pastel-sky
      image: "/mocks/workflow_step4.jpg"
    },
    {
      label: "05. VECTOR SEARCH",
      title: "Candidate Retrieval",
      badge: "[TOP-K CANDIDATES]",
      description: "Vector search finds the most relevant found-item candidates.",
      bgColor: "bg-[#F7C85B]", // pastel-yellow-gold
      image: "/mocks/workflow_step5.jpg"
    },
    {
      label: "06. SEMANTIC RERANKING",
      title: "Evidence Refinement",
      badge: "[SIGLIP2 + CALIBRATION]",
      description: "SigLIP2 reranks candidates and verification/calibration reduces overconfident matches.",
      bgColor: "bg-[#E4DDF7]", // pastel-lavender
      image: "/mocks/workflow_step6.jpg"
    },
    {
      label: "07. OWNERSHIP REVIEW",
      title: "Review & Reunite",
      badge: "[VERIFY → RETURN]",
      description: "User/staff review the evidence, verify ownership, and confirm return.",
      bgColor: "bg-[#FFD6BE]", // pastel-peach
      image: "/mocks/workflow_step7.jpg"
    }
  ];

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"]
  });

  // Desktop Scroll Progress
  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      const numSteps = steps.length;
      const stepSize = 1 / numSteps;
      let targetStep = Math.floor(latest / stepSize);
      if (targetStep >= numSteps) targetStep = numSteps - 1;
      setActiveStep(targetStep);
    }
  });

  // Mobile Intersection Observer (Fallback)
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth >= 1024) return;
      
      const focusLine = window.innerHeight * 0.4;
      let closestIdx = activeStep;
      let minDistance = Infinity;

      steps.forEach((_, idx) => {
        const el = document.getElementById(`workflow-step-${idx}`);
        if (el) {
          const rect = el.getBoundingClientRect();
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
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeStep, steps.length]);

  const handleStepClick = (idx: number) => {
    setActiveStep(idx);
    
    if (typeof window !== 'undefined') {
      if (window.innerWidth >= 1024 && sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const sectionTop = scrollTop + rect.top;
        const scrollableDistance = rect.height - window.innerHeight;
        
        const numSteps = steps.length;
        const stepSize = 1 / numSteps;
        const targetProgress = (idx * stepSize) + (stepSize / 2);
        
        window.scrollTo({
          top: sectionTop + scrollableDistance * targetProgress,
          behavior: 'smooth'
        });
      } else {
        const el = document.getElementById(`workflow-step-${idx}`);
        if (el) {
          const rect = el.getBoundingClientRect();
          const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
          const targetY = scrollTop + rect.top - (window.innerHeight * 0.2);
          
          window.scrollTo({
            top: targetY,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  return (
    <section 
      ref={sectionRef} 
      className="w-full bg-[#FBF9F5] border-b-2 border-[var(--color-retro-border)] relative lg:h-[700vh]"
    >
      <div className="lg:sticky lg:top-0 lg:h-screen lg:flex lg:flex-col lg:justify-center lg:overflow-hidden py-20 lg:py-0">
        <div className="max-w-7xl mx-auto px-6 w-full">
          <div className="mb-6">
            <div className="font-['Space_Mono'] text-[11px] text-[#b90a5a] uppercase font-bold tracking-[0.08em] mb-2">
              [ HOW IT WORKS // SYSTEM PROCESS ]
            </div>
            <h2 className="font-['Syne'] text-[36px] md:text-[42px] leading-[1.1] font-bold text-[var(--color-retro-charcoal)] max-w-2xl uppercase tracking-tight">
              Less searching.<br/>More finding.
            </h2>
            <p className="font-['Work_Sans'] text-[15px] leading-[24px] text-[#594046] max-w-md mt-2">
              Back2U uses the details you remember to narrow down the things you don&apos;t.
            </p>
          </div>

          <ProgressIndicator activeStep={activeStep} />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Panel - Sticky Viewer */}
            <div className="lg:col-span-5 bg-[#FBF9F5] border-2 border-[var(--color-retro-border)] shadow-[5px_5px_0px_#1A1A1A] hidden lg:block">
              <div className="bg-[#E2DDD5] px-4 py-2 border-b-2 border-[var(--color-retro-border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#FF3E72] border border-[var(--color-retro-border)]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FFD6BE] border border-[var(--color-retro-border)]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#C4EED0] border border-[var(--color-retro-border)]"></div>
                  <span className="ml-2 font-['Space_Mono'] text-[11px] font-bold text-[var(--color-retro-charcoal)] tracking-widest">BACK2U_WORKFLOW.EXE [v2.0]</span>
                </div>
                <span className="px-1.5 py-0.5 bg-[#C4EED0] border border-[var(--color-retro-border)] font-['Space_Mono'] text-[9px] uppercase font-bold text-[var(--color-retro-charcoal)] tracking-widest">ACTIVE</span>
              </div>
              
              <div className="p-3 bg-[#F5F2EB]">
                <div className="relative border-2 border-[var(--color-retro-border)] overflow-hidden aspect-square bg-[#EBE7DF]">
                  {steps.map((step, idx) => (
                    <motion.img
                      key={idx}
                      src={step.image}
                      alt={step.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={false}
                      animate={{ 
                        opacity: activeStep === idx ? 1 : 0,
                        scale: activeStep === idx ? 1 : 0.985,
                        y: activeStep === idx ? 0 : 4
                      }}
                      transition={{ duration: 0.45, ease: "easeOut" }}
                    />
                  ))}
                  
                  {/* Floating HUD Tags */}
                  <div className="absolute bottom-3 right-3 bg-[#FBF9F5] px-2.5 py-1 font-['Space_Mono'] text-[10px] text-[var(--color-retro-charcoal)] border border-[var(--color-retro-border)] shadow-[1px_1px_0px_#1A1A1A] tracking-widest uppercase">
                    PROCESS: {steps[activeStep].badge}
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-[#FBF9F5] border border-[var(--color-retro-border)]">
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
            <div className="lg:col-span-7 flex flex-col gap-2 relative z-0">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  id={`workflow-step-${idx}`}
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
                  className={`${step.bgColor} border-2 border-[var(--color-retro-border)] shadow-[4px_4px_0px_#1A1A1A] transition-all duration-400 relative cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-[#FF3E72] overflow-hidden`}
                  style={{
                    transform: activeStep === idx ? 'translateX(-8px)' : 'translateX(0)',
                    boxShadow: activeStep === idx ? '6px 6px 0px #1A1A1A' : '3px 3px 0px #1A1A1A',
                    opacity: activeStep === idx ? 1 : 0.6,
                  }}
                >
                  <div className="p-2.5 lg:p-3">
                    {/* Mobile inline image (hidden on desktop) */}
                    <div className="lg:hidden mb-4 relative border-2 border-[var(--color-retro-border)] aspect-video overflow-hidden">
                       <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
                    </div>
                    
                    <div className="flex items-center gap-3 lg:gap-4">
                      <span className="font-['Space_Mono'] text-[10px] tracking-widest uppercase font-bold px-2 py-1 bg-[#FBF9F5] border border-[var(--color-retro-border)] shrink-0">
                        {step.label.split('.')[0]}
                      </span>
                      <span className="font-['Syne'] text-[16px] lg:text-[18px] text-[var(--color-retro-charcoal)] font-bold tracking-tight uppercase truncate">
                        {step.title}
                      </span>
                    </div>

                    <motion.div 
                      initial={false}
                      animate={{ 
                        height: activeStep === idx ? 'auto' : 0,
                        opacity: activeStep === idx ? 1 : 0,
                        marginTop: activeStep === idx ? 8 : 0
                      }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <span className="font-['Space_Mono'] text-[9px] px-2 py-1 bg-white border border-[var(--color-retro-border)] text-[#b90a5a] font-bold tracking-widest whitespace-nowrap w-fit">
                          {step.badge}
                        </span>
                      </div>
                      <p className="font-['Work_Sans'] text-[13.5px] lg:text-[14.5px] text-[var(--color-retro-charcoal)] leading-relaxed font-medium max-w-lg">
                        {step.description}
                      </p>
                    </motion.div>
                  </div>
                </div>
              ))}
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
}
