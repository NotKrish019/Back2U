'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { updateProfile, updateEmail } from 'firebase/auth';
import { UserRound, FileText, Settings, ShieldCheck, Check } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Interactive States
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [newsletter, setNewsletter] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      setDisplayName(user.displayName || '');
      
      // Prioritize Firebase email, but fallback to saved contact email for phone users
      const savedEmail = localStorage.getItem(`contactEmail_${user.uid}`);
      setEmail(user.email || savedEmail || '');
      
      const savedEmailAlerts = localStorage.getItem(`emailAlerts_${user.uid}`);
      if (savedEmailAlerts !== null) setEmailAlerts(savedEmailAlerts === 'true');
      
      const savedNewsletter = localStorage.getItem(`newsletter_${user.uid}`);
      if (savedNewsletter !== null) setNewsletter(savedNewsletter === 'true');
    }
  }, [user, loading, router]);

  const handleSaveProfile = async () => {
    setError(null);
    try {
      if (user) {
        if (displayName !== user.displayName) {
          await updateProfile(user, { displayName });
        }
        
        // Save to localStorage as a reliable fallback
        localStorage.setItem(`contactEmail_${user.uid}`, email);
        
        if (email !== user.email && email.trim() !== '') {
          try {
            await updateEmail(user, email);
          } catch (err: any) {
            // Firebase requires recent login to update auth email, or blocks it for phone users without linking
            // We ignore the error because we've already saved it as a contact email in localStorage
            console.warn("Firebase updateEmail failed, falling back to local contact email:", err);
          }
        }
        localStorage.setItem(`emailAlerts_${user.uid}`, emailAlerts.toString());
        localStorage.setItem(`newsletter_${user.uid}`, newsletter.toString());
      }
      
      if (!error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error: any) {
      console.error(error);
      setError('Failed to save changes.');
    }
  };

  if (loading || !user) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading settings...</div>;
  }

  const initials = displayName ? displayName.substring(0, 2).toUpperCase() : email ? email.substring(0, 2).toUpperCase() : 'ME';

  return (
    <div className="page-shell profile-page">
      <PageTop 
        eyebrow="Your profile" 
        title={<>A little space<br /><em>for your details.</em></>} 
        intro="Keep your contact details and notification preferences ready for the moments they matter." 
        action={<div className="profile-avatar-large">{initials}</div>} 
      />
      <section className="profile-layout container-wide">
        <aside className="profile-nav">
          <button className="profile-nav-active"><UserRound size={16} />Profile</button>
          <button onClick={() => router.push("/my-reports")}><FileText size={16} />My reports</button>
        </aside>
        <div className="profile-form">
          <div className="profile-section">
            <SectionLabel>Account details</SectionLabel>
            <h2>How can we reach you?</h2>
            
            {error && <p className="field-error" style={{ marginBottom: '1rem', color: '#b9463f', fontSize: '13px', fontWeight: 600 }}>{error}</p>}
            
            <div className="form-grid">
              <label>Display name
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your Name" />
              </label>
            </div>
            
            <label>Email address
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
            </label>
            
            {user.phoneNumber && (
              <label style={{ marginTop: '22px', display: 'block' }}>Mobile number
                <input value={user.phoneNumber} readOnly disabled style={{ opacity: 0.7 }} />
              </label>
            )}
          </div>
          <div className="profile-section">
            <SectionLabel>Notifications</SectionLabel>
            <h2>Keep me in the loop.</h2>
            <label className="toggle-row">
              <span><b>Email alerts for matches</b><small>Only when a report looks relevant.</small></span>
              <input type="checkbox" checked={emailAlerts} onChange={(e) => setEmailAlerts(e.target.checked)} />
            </label>
            <label className="toggle-row">
              <span><b>Weekly campus signal</b><small>A quiet digest of new reports and returns.</small></span>
              <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
            </label>
          </div>
          <div className="profile-save">
            <span>{saved ? "Changes saved." : "Last updated recently"}</span>
            <Button onClick={handleSaveProfile} variant="solid" icon={<Check size={16} />}>Save changes</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
