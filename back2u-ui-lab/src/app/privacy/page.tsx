"use client";

import React from 'react';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import TicketStubFooter from "@/components/ui/ticket-stub-footer";
import { CloudShader } from "@/components/ui/cloud-shader";
import "../report/lost/report.css"; 

export default function PrivacyPolicyPage() {
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
              PRIVACY POLICY
            </h1>
            <p className="font-['Space_Mono'] text-[13px] tracking-wider uppercase text-[#5A5261] font-medium pb-8 border-b-2 border-[#211C2B]/10">
              Last Updated: September 23, 2026
            </p>
          </div>

          <div className="flex flex-col gap-10">
            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                1. Introduction
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                Welcome to Back2U. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                2. The Data We Collect About You
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium mb-4">
                Personal data, or personal information, means any information about an individual from which that person can be identified. We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:
              </p>
              <ul className="list-none space-y-3">
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span><strong>Identity Data:</strong> includes first name, last name, username or similar identifier, and profile picture.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span><strong>Contact Data:</strong> includes email address and telephone numbers. Telephone numbers are used exclusively for secure account authentication (SMS OTP) and, if you opt in, urgent notifications about your items.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span><strong>Content Data:</strong> includes images of items you upload, descriptions of lost/found items, and location data related to where items were lost or found.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span><strong>Usage Data:</strong> includes information about how you use our website, products and services.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                3. How We Use Your Personal Data
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium mb-4">
                We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
              </p>
              <ul className="list-none space-y-3">
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>To register you as a new user.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>To process and deliver your lost or found item reports.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>To utilize our Machine Learning algorithms to match lost and found items.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>To manage our relationship with you, including notifying you of matches.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>To improve our website, services, marketing, customer relationships and experiences.</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                4. Data Security
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know. They will only process your personal data on our instructions and they are subject to a duty of confidentiality.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                5. AI & Machine Learning
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                Back2U utilizes advanced Machine Learning models to identify and match items. The images you upload (Content Data) are processed by these models to extract vector representations. We do not use facial recognition, nor do we attempt to identify individuals from the images uploaded. Images are strictly used for the purpose of identifying and matching physical objects.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                6. Data Retention
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements. Resolved reports and associated images may be kept in an anonymized format for the purpose of training and improving our object recognition algorithms, unless you explicitly request deletion.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                7. Your Legal Rights
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium mb-4">
                Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to:
              </p>
              <ul className="list-none space-y-3 mb-4">
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Request access to your personal data.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Request correction of your personal data.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Request erasure of your personal data.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Object to processing of your personal data.</span>
                </li>
                <li className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium flex items-start">
                  <span className="text-[#FF3E72] mr-3 mt-1.5 text-[10px]">■</span>
                  <span>Request restriction of processing your personal data.</span>
                </li>
              </ul>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                You can exercise most of these rights directly through your Account Settings page on our platform.
              </p>
            </section>

            <section>
              <h2 className="font-['Syne'] text-[22px] md:text-[26px] font-bold text-[#2A2140] mb-4 leading-tight">
                8. Contact Us
              </h2>
              <p className="font-['Work_Sans'] text-[#40384A] text-[16px] leading-[1.7] font-medium">
                If you have any questions about this privacy policy or our privacy practices, please contact our data privacy manager at: <strong><a href="mailto:privacy@back2u.example.edu" className="text-[#FF3E72] hover:underline">privacy@back2u.example.edu</a></strong>.
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
