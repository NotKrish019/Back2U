"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { UserRound, FileText, Check } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '../report/lost/ManusUILab';
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import TicketStubFooter from "@/components/ui/ticket-stub-footer";
import Navigation from "@/components/Navigation";
import "../report/lost/report.css";

export default function SettingsPage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // Interactive States
  const [displayName, setDisplayName] = useState('Campus User');
  const [email, setEmail] = useState('demo@university.edu');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const loggedIn = localStorage.getItem('demo_logged_in') === 'true';
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        router.push('/login');
      }
    };
    
    checkAuth();
    window.addEventListener('storage', checkAuth);
    window.addEventListener('demo_auth_change', checkAuth);
    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('demo_auth_change', checkAuth);
    };
  }, [router]);

  const handleSaveProfile = async () => {
    setError(null);
    try {
      // Demo save delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save changes.');
    }
  };

  if (!isLoggedIn) {
    return <div className="min-h-screen flex items-center justify-center font-mono text-[#2A2140]">Authenticating...</div>;
  }

  const initials = displayName ? displayName.substring(0, 2).toUpperCase() : 'ME';

  return (
    <div className="report-page bg-[var(--color-surface-canvas)] min-h-screen relative font-sans">
      <GlobalMeshBackground />
      
      <main className="pb-32 relative z-10">
        <PageTop 
          eyebrow="Your profile" 
          title={<>A little space<br /><em>for your details.</em></>} 
          intro="Keep your contact details and notification preferences ready for the moments they matter." 
          action={
            <div className="w-[80px] h-[80px] rounded-full bg-[#2A2140] text-[#FFF9F4] border-[2px] border-[#211C2B] flex items-center justify-center text-[28px] font-bold tracking-wider font-mono shadow-[4px_4px_0px_#211C2B]">
              {initials}
            </div>
          } 
        />

        <div className="w-full max-w-[1400px] mx-auto px-6 md:px-12 flex flex-col lg:flex-row gap-12 lg:gap-24">
          
          <aside className="lg:w-64 flex-shrink-0 flex flex-col gap-2 font-mono text-[11px] font-bold tracking-widest uppercase">
            <button className="flex items-center gap-3 py-3 px-4 bg-[#FF3E72] text-white border-[2px] border-[#211C2B] shadow-[2px_2px_0px_#211C2B] w-full text-left transition-all">
              <UserRound size={16} />
              Profile
            </button>
            <button 
              onClick={() => router.push("/reports")}
              className="flex items-center gap-3 py-3 px-4 text-[#211C2B] border-[2px] border-transparent hover:border-[#211C2B] hover:shadow-[2px_2px_0px_#211C2B] w-full text-left transition-all"
            >
              <FileText size={16} />
              My reports
            </button>
          </aside>

          <div className="flex-1 max-w-2xl flex flex-col gap-16">
            
            {/* Account Details Section */}
            <div className="flex flex-col gap-8">
              <div>
                <SectionLabel>Account details</SectionLabel>
                <h2 className="font-['Syne'] text-4xl font-bold tracking-tight text-[#211C2B] mt-2">How can we reach you?</h2>
              </div>
              
              {error && <p className="text-[#FF3E72] font-mono text-[11px] font-bold uppercase">{error}</p>}
              
              <div className="flex flex-col gap-6">
                <label className="flex flex-col gap-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#211C2B]">
                  Display name
                  <input 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    placeholder="Your Name" 
                    className="w-full bg-[#FFF9F4] border-[2px] border-[#211C2B] p-4 text-[16px] font-sans font-medium text-[#211C2B] focus:outline-none focus:ring-2 focus:ring-[#FF3E72] focus:border-[#FF3E72] transition-colors rounded-sm placeholder:text-[#211C2B]/30"
                  />
                </label>
                
                <label className="flex flex-col gap-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#211C2B]">
                  Email address
                  <input 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="you@university.edu" 
                    className="w-full bg-[#FFF9F4] border-[2px] border-[#211C2B] p-4 text-[16px] font-sans font-medium text-[#211C2B] focus:outline-none focus:ring-2 focus:ring-[#FF3E72] focus:border-[#FF3E72] transition-colors rounded-sm placeholder:text-[#211C2B]/30"
                  />
                </label>

                <label className="flex flex-col gap-2 font-mono text-[11px] font-bold tracking-widest uppercase text-[#211C2B] opacity-60">
                  Mobile number
                  <input 
                    value="+1 (555) 123-4567" 
                    readOnly 
                    disabled 
                    className="w-full bg-[#211C2B]/5 border-[2px] border-[#211C2B]/20 p-4 text-[16px] font-sans font-medium text-[#211C2B] rounded-sm cursor-not-allowed"
                  />
                </label>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="flex flex-col gap-8 pt-8 border-t-[2px] border-[#211C2B]">
              <div>
                <SectionLabel>Notifications</SectionLabel>
                <h2 className="font-['Syne'] text-4xl font-bold tracking-tight text-[#211C2B] mt-2">Keep me in the loop.</h2>
              </div>
              
              <div className="flex flex-col gap-6">
                <label className="flex items-start justify-between gap-4 cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="font-bold text-[16px] text-[#211C2B]">Email alerts for matches</span>
                    <span className="font-mono text-[12px] opacity-70 mt-1">Only when a report looks relevant.</span>
                  </div>
                  <div className="relative w-12 h-6 mt-1 flex-shrink-0 rounded-full border-[2px] border-[#211C2B] bg-[#FFF9F4] overflow-hidden transition-colors">
                    <div className={`absolute top-0 bottom-0 left-0 bg-[#FF3E72] transition-all duration-300 ease-out ${emailAlerts ? 'w-full' : 'w-0'}`} />
                    <div className={`absolute top-[2px] w-[16px] h-[16px] bg-[#211C2B] rounded-full transition-all duration-300 ease-out shadow-sm ${emailAlerts ? 'left-[26px] bg-[#FFF9F4]' : 'left-[2px]'}`} />
                    <input type="checkbox" className="sr-only" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
                  </div>
                </label>

                <label className="flex items-start justify-between gap-4 cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="font-bold text-[16px] text-[#211C2B]">Weekly campus signal</span>
                    <span className="font-mono text-[12px] opacity-70 mt-1">A quiet digest of new reports and returns.</span>
                  </div>
                  <div className="relative w-12 h-6 mt-1 flex-shrink-0 rounded-full border-[2px] border-[#211C2B] bg-[#FFF9F4] overflow-hidden transition-colors">
                    <div className={`absolute top-0 bottom-0 left-0 bg-[#FF3E72] transition-all duration-300 ease-out ${newsletter ? 'w-full' : 'w-0'}`} />
                    <div className={`absolute top-[2px] w-[16px] h-[16px] bg-[#211C2B] rounded-full transition-all duration-300 ease-out shadow-sm ${newsletter ? 'left-[26px] bg-[#FFF9F4]' : 'left-[2px]'}`} />
                    <input type="checkbox" className="sr-only" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-8">
              <Button onClick={handleSaveProfile} variant="solid" icon={<Check size={16} />}>Save changes</Button>
              <span className="font-mono text-[11px] font-bold tracking-widest uppercase opacity-60">
                {saved ? "Changes saved." : "Last updated recently"}
              </span>
            </div>

          </div>
        </div>
      </main>

      <div className="relative z-10">
        <TicketStubFooter 
          brand="BACK2U"
          wordmark="BACK2U"
          company="BACK2U"
          eyebrow={["LOST TODAY. BACK TO YOU TOMORROW.", "FIND \u00b7 REUNITE \u00b7 BELONG", "PHOTO \u00b7 DESCRIPTION \u00b7 LOCATION \u2192 POSSIBLE MATCH", "ONE PLACE FOR LOST & FOUND", "BUILT FOR CAMPUS LIFE"]}
        />
      </div>
    </div>
  );
}
