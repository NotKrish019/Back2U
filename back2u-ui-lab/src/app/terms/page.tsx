"use client";

import React from 'react';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import TicketStubFooter from "@/components/ui/ticket-stub-footer";
import { CloudShader } from "@/components/ui/cloud-shader";
import "../report/lost/report.css"; 

export default function TermsAndConditionsPage() {
  return (
    <>
      {/* Background layer */}
      <GlobalMeshBackground />
      
      {/* Subtle cloudscape at top, identical treatment to the report pages but mostly faded */}
      <div 
        className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40"
        style={{ 
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)', 
          webkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 60%)' 
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
              LEGAL
            </div>
            <h1 className="font-['Syne'] text-[clamp(40px,6vw,64px)] leading-[1.05] font-extrabold tracking-tight mb-6 text-[#211C2B]">
              TERMS & CONDITIONS
            </h1>
            <p className="font-['Space_Mono'] text-[13px] tracking-wider uppercase text-[#5A5261] font-medium pb-8 border-b-2 border-[#211C2B]/10">
              Last Updated: September 23, 2026
            </p>
          </div>

          <div className="flex flex-col gap-10">
            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                1. Agreement to Terms
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Back2U ("we," "us" or "our"), concerning your access to and use of the Back2U website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto. You agree that by accessing the site, you have read, understood, and agree to be bound by all of these Terms and Conditions.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                2. User Registration
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium mb-4">
                You may be required to register with the site. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.
              </p>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                By registering or verifying your account using a mobile phone number, you consent to receive SMS text messages for authentication (One-Time Passwords) and account security purposes. Standard message and data rates may apply. You may update your notification preferences in your Account Settings.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                3. User Generated Contributions
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium mb-4">
                The site may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Site, including but not limited to text, writings, video, audio, photographs, graphics, comments, suggestions, or personal information or other material (collectively, "Contributions").
              </p>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                Any Contributions you transmit may be treated as non-confidential and non-proprietary. By uploading physical item images and descriptions, you grant us the right to use this data to perform machine learning object-matching services and improve our internal algorithms.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                4. Prohibited Activities
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium mb-4">
                You may not access or use the Site for any purpose other than that for which we make the Site available. The Site may not be used in connection with any commercial endeavors except those that are specifically endorsed or approved by us. As a user of the Site, you agree not to:
              </p>
              <ul className="list-none space-y-3">
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Systematically retrieve data or other content from the Site to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Upload false, misleading, or fraudulent reports regarding lost or found items.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Use the Site to advertise or offer to sell goods and services.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Interfere with, disrupt, or create an undue burden on the Site or the networks or services connected to the Site.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Attempt to bypass any measures of the Site designed to prevent or restrict access to the Site, or any portion of the Site.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                5. Intellectual Property Rights
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws and various other intellectual property rights.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                6. Disclaimer and Limitations of Liability
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                The Site is provided on an as-is and as-available basis. You agree that your use of the Site and our services will be at your sole risk. To the fullest extent permitted by law, we disclaim all warranties, express or implied, in connection with the Site and your use thereof. We make no warranties or representations about the accuracy or completeness of the Site's content. We are not responsible for verifying the legal ownership of physical items exchanged through this platform.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                7. Term and Termination
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                These Terms and Conditions shall remain in full force and effect while you use the Site. WITHOUT LIMITING ANY OTHER PROVISION OF THESE TERMS AND CONDITIONS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SITE, TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE TERMS AND CONDITIONS OR OF ANY APPLICABLE LAW OR REGULATION.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                8. Contact Us
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at: <strong><a href="mailto:legal@back2u.example.edu" className="text-[#FF3E72] hover:underline">legal@back2u.example.edu</a></strong>.
              </p>
            </section>
          </div>
          
        </div>
      </div>

      <TicketStubFooter 
        brand="BACK2U"
        wordmark="BACK2U"
        company="BACK2U"
        eyebrow={["LOST TODAY. BACK TO YOU TOMORROW.", "FIND \u00b7 REUNITE \u00b7 BELONG", "PHOTO \u00b7 DESCRIPTION \u00b7 LOCATION \u2192 POSSIBLE MATCH", "ONE PLACE FOR LOST & FOUND", "BUILT FOR CAMPUS LIFE"]}
        headline={["WHAT'S LOST CAN FIND", "ITS WAY BACK2U."]}
        description="Search by photo, description, place, or whatever you remember."
        cta={{ label: "I LOST SOMETHING", href: "/report/lost" }}
        sections={[{ label: "FIND" }, { label: "MATCH" }, { label: "VERIFY" }, { label: "REUNITE" }, { label: "BELONG" }]}
        linkGroups={[
          { title: "FIND & RECOVER", links: [{ label: "Search", href: "/search" }, { label: "Browse", href: "/browse" }, { label: "Hotspots", href: "/hotspots" }, { label: "Report Lost", href: "/report/lost" }, { label: "Report Found", href: "/report/found" }] },
          { title: "BACK2U", links: [{ label: "My Reports", href: "/reports" }, { label: "Support", href: "/support" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
        ]}
        blurb="Back2U combines image understanding, textual description and contextual signals to retrieve and rank possible matches for the same physical item."
      />
    </>
  );
}
