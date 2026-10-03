"use client";

import React, { useState } from 'react';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import { CloudShader } from "@/components/ui/cloud-shader";
import { Mail, MessageCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import "../report/lost/report.css";

const FAQS = [
  {
    q: "How does the AI matching work?",
    a: "Our AI model analyzes your submitted photo and description, extracting visual features and keywords to compare against all found items in the database. It instantly surfaces the most probable matches based on visual similarity and text overlap."
  },
  {
    q: "I lost something today, what should I do?",
    a: "Immediately file a 'Report Lost' ticket. Provide as much detail as possible, including a photo if you have one, and the last known location. The system will alert you if a matching item is turned in."
  },
  {
    q: "How do I verify ownership of an item?",
    a: "When claiming a found item, you'll need to answer a few verification questions or provide specific details not visible in the public listing (like a serial number, unique scratch, or password if it's a device)."
  },
  {
    q: "Can I edit my report after submission?",
    a: "Yes, you can edit your active reports from the 'My Reports' dashboard. You can add more photos, update the description, or mark the item as resolved if you found it yourself."
  },
  {
    q: "How long are items kept in the system?",
    a: "Lost reports remain active for 90 days. Found items are held at the central campus lost and found office for 60 days before being donated or recycled according to university policy."
  },
  {
    q: "Who can see my contact information?",
    a: "Your personal contact information is kept strictly confidential. Communication between finders and losers is handled securely through the Back2U platform until you choose to share your details."
  }
];

export default function SupportPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <>
      {/* Background layer */}
      <GlobalMeshBackground />
      
      {/* Subtle cloudscape at top, identical treatment to the report pages but mostly faded */}
      <div 
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40"
        style={{ 
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)', 
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)' 
        }}
      >
        <CloudShader
          className="h-full w-full scale-105"
          speed={0.2}
          count={4}
          cloudColor="#FFFFFF"
          skyTopColor="#C5B5E8"
          skyBottomColor="#A7D8F5"
        />
      </div>

      {/* Main Content */}
      <div className="relative w-full pt-32 pb-32 px-6 overflow-hidden z-10">
        <div className="w-full max-w-[800px] mx-auto bg-[#F4F1EB]/85 backdrop-blur-md border-2 border-[var(--color-retro-border)] shadow-[6px_6px_0px_#1A1A1A] p-8 md:p-14 animate-step">
          
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 font-['Space_Mono'] text-[10px] tracking-widest uppercase mb-6 text-[var(--color-hot-pink)] border border-[var(--color-retro-border)] bg-[#2A2140] px-3 py-1 font-bold">
              HELP CENTER
            </div>
            <h1 className="font-['Syne'] text-[clamp(40px,6vw,64px)] leading-[1.05] font-extrabold tracking-tight mb-6 text-[#211C2B]">
              HOW CAN WE HELP?
            </h1>
            <p className="font-['Space_Mono'] text-[13px] tracking-wider uppercase text-[#5A5261] font-medium pb-8 border-b-2 border-[#211C2B]/10">
              Find answers, ask questions, and get support.
            </p>
          </div>

          <div className="flex flex-col gap-10">
            
            {/* Quick Links / FAQs */}
            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-6 leading-tight">
                Frequently Asked Questions
              </h2>
              <div className="grid grid-cols-1 gap-4">
                {FAQS.map((faq, i) => {
                  const isOpen = openFaq === i;
                  return (
                    <div 
                      key={i} 
                      onClick={() => toggleFaq(i)}
                      className="bg-white border-2 border-[var(--color-retro-border)] p-4 shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all cursor-pointer group flex flex-col"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-['Work_Sans'] font-semibold text-[15px] text-[#40384A] group-hover:text-[#FF3E72] transition-colors">
                          {faq.q}
                        </p>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-[#5A5261] group-hover:text-[#FF3E72] transition-colors"
                        >
                          <ChevronDown size={20} />
                        </motion.div>
                      </div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <p className="pt-4 mt-4 border-t-2 border-[#211C2B]/10 font-['Work_Sans'] text-[14px] leading-relaxed text-[#5A5261]">
                              {faq.a}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Contact Methods */}
            <section className="border-t-2 border-[#211C2B]/10 pt-10">
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-6 leading-tight">
                Get in Touch
              </h2>
              <div className="flex flex-col sm:flex-row gap-6">
                
                <div className="flex-1 bg-white border-2 border-[var(--color-retro-border)] p-6 shadow-[4px_4px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A1A] transition-all flex flex-col items-start gap-4">
                  <div className="w-12 h-12 bg-[#C5B5E8] border-2 border-[var(--color-retro-border)] flex items-center justify-center shadow-[2px_2px_0px_#1A1A1A]">
                    <Mail className="text-[#211C2B]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-['Syne'] font-bold text-[18px] text-[#211C2B] mb-1">Email Us</h3>
                    <p className="font-['Work_Sans'] text-[14px] text-[#5A5261]">
                      Drop us a line at <span className="font-bold underline cursor-pointer hover:text-[#FF3E72] transition-colors">support@back2u.edu</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-white border-2 border-[var(--color-retro-border)] p-6 shadow-[4px_4px_0px_#1A1A1A] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#1A1A1A] transition-all flex flex-col items-start gap-4">
                  <div className="w-12 h-12 bg-[#F29BB2] border-2 border-[var(--color-retro-border)] flex items-center justify-center shadow-[2px_2px_0px_#1A1A1A]">
                    <MessageCircle className="text-[#211C2B]" size={24} />
                  </div>
                  <div>
                    <h3 className="font-['Syne'] font-bold text-[18px] text-[#211C2B] mb-1">Live Chat</h3>
                    <p className="font-['Work_Sans'] text-[14px] text-[#5A5261]">
                      Available Mon-Fri, 9am-5pm EST. <span className="font-bold underline cursor-pointer hover:text-[#FF3E72] transition-colors">Start Chat</span>
                    </p>
                  </div>
                </div>
                
              </div>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}
