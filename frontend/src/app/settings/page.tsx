'use client';

import { useAuth } from '@/lib/firebase/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Shield, Lock, Trash2, Mail, Phone, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { updateProfile, updatePassword, deleteUser } from 'firebase/auth';

// Reusable Toggle Component
const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer', margin: 0 }}>
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onChange(e.target.checked)} 
      style={{ opacity: 0, width: 0, height: 0, position: 'absolute' }} 
    />
    <span style={{ 
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: checked ? 'var(--accent-red)' : 'var(--border-color)', 
      borderRadius: '24px', transition: '0.3s ease-in-out' 
    }}>
      <span style={{ 
        position: 'absolute', content: '""', height: '18px', width: '18px', 
        left: checked ? '22px' : '4px', bottom: '3px', 
        backgroundColor: 'white', borderRadius: '50%', transition: '0.3s ease-in-out',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }} />
    </span>
  </label>
);

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');

  // Interactive States
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  
  const [showEmail, setShowEmail] = useState(true);
  const [anonymousReporting, setAnonymousReporting] = useState(false);
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI Feedback States
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    } else if (user) {
      setDisplayName(user.displayName || '');
      
      // Load extended preferences from localStorage
      const savedBio = localStorage.getItem(`bio_${user.uid}`);
      if (savedBio) setBio(savedBio);
      
      const savedEmailAlerts = localStorage.getItem(`emailAlerts_${user.uid}`);
      if (savedEmailAlerts !== null) setEmailAlerts(savedEmailAlerts === 'true');
      const savedSmsAlerts = localStorage.getItem(`smsAlerts_${user.uid}`);
      if (savedSmsAlerts !== null) setSmsAlerts(savedSmsAlerts === 'true');
      
      const savedNewsletter = localStorage.getItem(`newsletter_${user.uid}`);
      if (savedNewsletter !== null) setNewsletter(savedNewsletter === 'true');
      
      const savedShowEmail = localStorage.getItem(`showEmail_${user.uid}`);
      if (savedShowEmail !== null) setShowEmail(savedShowEmail === 'true');
      
      const savedAnon = localStorage.getItem(`anonymousReporting_${user.uid}`);
      if (savedAnon !== null) setAnonymousReporting(savedAnon === 'true');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-purple)' }}>
        Loading settings...
      </div>
    );
  }

  // Action Handlers
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (user && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      
      if (user) {
        localStorage.setItem(`bio_${user.uid}`, bio);
        localStorage.setItem(`emailAlerts_${user.uid}`, emailAlerts.toString());
        localStorage.setItem(`smsAlerts_${user.uid}`, smsAlerts.toString());
        localStorage.setItem(`newsletter_${user.uid}`, newsletter.toString());
        localStorage.setItem(`showEmail_${user.uid}`, showEmail.toString());
        localStorage.setItem(`anonymousReporting_${user.uid}`, anonymousReporting.toString());
      }
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 600));
      setSaveMessage('Changes saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error(error);
      setSaveMessage('Failed to save changes.');
      setTimeout(() => setSaveMessage(''), 3000);
    }
    setIsSaving(false);
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      setPasswordMessage('Passwords do not match!');
      setTimeout(() => setPasswordMessage(''), 3000);
      return;
    }
    try {
      await updatePassword(user, newPassword);
      setPasswordMessage('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setTimeout(() => setPasswordMessage(''), 3000);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        setPasswordMessage('Please sign out and sign in again to change password.');
      } else {
        setPasswordMessage('Failed to update password.');
      }
      setTimeout(() => setPasswordMessage(''), 4000);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you absolutely sure you want to delete your account? This cannot be undone.')) {
      try {
        await deleteUser(user);
        router.push('/');
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login') {
          alert('Please sign out and sign in again to delete your account.');
        }
      }
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile Settings', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security & Login', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: Lock },
  ];

  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
      <div style={{ marginBottom: '3rem' }}>
        <span className="subheading">PREFERENCES</span>
        <h1 className="heading-lg" style={{ fontSize: '3rem', margin: '0.5rem 0' }}>ACCOUNT SETTINGS</h1>
        <p style={{ color: 'var(--text-purple)', opacity: 0.7, maxWidth: '600px', fontSize: '1.1rem', lineHeight: 1.6 }}>
          Manage your personal information, notification preferences, and security settings.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '3rem', alignItems: 'start' }}>
        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  border: 'none',
                  background: isActive ? 'var(--white)' : 'transparent',
                  borderRadius: '8px',
                  color: isActive ? 'var(--accent-red)' : 'var(--text-purple)',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.03)' : 'none',
                  borderLeft: isActive ? '3px solid var(--accent-red)' : '3px solid transparent'
                }}
                className={!isActive ? "hover:bg-white/50" : ""}
              >
                <Icon size={18} style={{ opacity: isActive ? 1 : 0.6 }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div style={{ backgroundColor: 'var(--white)', borderRadius: '12px', padding: '3rem', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid var(--border-color)', minHeight: '500px' }}>
          <AnimatePresence mode="wait">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', color: 'var(--text-purple)', marginBottom: '0.5rem' }}>Public Profile</h2>
                  <p style={{ color: 'var(--text-purple)', opacity: 0.6, fontSize: '0.9rem' }}>This information may be shared with users who match with your items.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', paddingBottom: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--bg-cream)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-purple)', opacity: 0.5 }}>
                        <User size={32} />
                      </div>
                    )}
                  </div>
                  <div>
                    <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Change Photo</button>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-purple)', opacity: 0.5 }}>JPG, GIF or PNG. Max size of 2MB.</p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-purple)' }}>Display Name</label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-cream)', fontSize: '0.9rem', color: 'var(--text-purple)', width: '100%' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-purple)' }}>Email Address</label>
                    <input type="email" value={user.email || 'Not provided'} readOnly style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.03)', fontSize: '0.9rem', color: 'var(--text-purple)', width: '100%', opacity: 0.7 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-purple)' }}>Phone Number</label>
                    <input type="tel" value={user.phoneNumber || 'Not provided'} readOnly style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.03)', fontSize: '0.9rem', color: 'var(--text-purple)', width: '100%', opacity: 0.7 }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-purple)' }}>Bio (Optional)</label>
                    <textarea 
                      rows={3} 
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="A short bio..." 
                      style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-cream)', fontSize: '0.9rem', color: 'var(--text-purple)', width: '100%', resize: 'none' }} 
                    />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5rem' }}>
                  {saveMessage && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2E7D32', fontSize: '0.85rem', fontWeight: 600 }}>
                      <CheckCircle size={16} /> {saveMessage}
                    </span>
                  )}
                  <button 
                    onClick={handleSaveProfile}
                    className="btn" 
                    style={{ padding: '0.75rem 2rem', opacity: isSaving ? 0.7 : 1 }}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', color: 'var(--text-purple)', marginBottom: '0.5rem' }}>Notification Preferences</h2>
                  <p style={{ color: 'var(--text-purple)', opacity: 0.6, fontSize: '0.9rem' }}>Choose how and when we should contact you.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-purple)', marginBottom: '0.25rem' }}>Email Alerts for Matches</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.6 }}>Receive an email instantly when the AI finds a high-confidence match for your item.</p>
                    </div>
                    <Toggle checked={emailAlerts} onChange={setEmailAlerts} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-purple)', marginBottom: '0.25rem' }}>SMS Alerts for Matches</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.6 }}>Receive a text message instantly when the AI finds a high-confidence match for your item. (Requires phone verification).</p>
                    </div>
                    <Toggle checked={smsAlerts} onChange={setSmsAlerts} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-purple)', marginBottom: '0.25rem' }}>Campus Newsletter</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.6 }}>Weekly updates about campus events and successful return stories.</p>
                    </div>
                    <Toggle checked={newsletter} onChange={setNewsletter} />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5rem' }}>
                  {saveMessage && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2E7D32', fontSize: '0.85rem', fontWeight: 600 }}>
                      <CheckCircle size={16} /> {saveMessage}
                    </span>
                  )}
                  <button onClick={handleSaveProfile} className="btn" style={{ padding: '0.75rem 2rem', opacity: isSaving ? 0.7 : 1 }}>
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', color: 'var(--text-purple)', marginBottom: '0.5rem' }}>Security & Login</h2>
                  <p style={{ color: 'var(--text-purple)', opacity: 0.6, fontSize: '0.9rem' }}>Manage your password and security methods.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-purple)' }}>Change Password</h4>
                  
                  {user.providerData.some(p => p.providerId === 'google.com') ? (
                    <div style={{ padding: '1rem', backgroundColor: 'var(--bg-cream)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem', color: 'var(--text-purple)' }}>
                      You signed in with Google. Passwords are managed through your Google Account.
                    </div>
                  ) : (
                    <>
                      <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Current Password" style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-cream)', fontSize: '0.9rem', color: 'var(--text-purple)', maxWidth: '400px' }} />
                      <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New Password" style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-cream)', fontSize: '0.9rem', color: 'var(--text-purple)', maxWidth: '400px' }} />
                      <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" style={{ padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-cream)', fontSize: '0.9rem', color: 'var(--text-purple)', maxWidth: '400px' }} />
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <button onClick={handleUpdatePassword} className="btn" style={{ padding: '0.5rem 1rem', maxWidth: '200px' }}>Update Password</button>
                        {passwordMessage && (
                          <span style={{ fontSize: '0.85rem', color: passwordMessage.includes('success') ? '#2E7D32' : 'var(--accent-red)', fontWeight: 600 }}>
                            {passwordMessage}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem', marginTop: '1rem' }}>
                  <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--accent-red)', marginBottom: '1rem' }}>Danger Zone</h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', border: '1px solid var(--accent-red)', borderRadius: '8px', backgroundColor: 'rgba(240, 92, 85, 0.05)' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '0.25rem' }}>Delete Account</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-purple)', opacity: 0.7 }}>Permanently remove your account and all associated report data.</p>
                    </div>
                    <button onClick={handleDeleteAccount} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', backgroundColor: 'var(--accent-red)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>Delete Account</button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <motion.div
                key="privacy"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
              >
                <div>
                  <h2 style={{ fontFamily: 'var(--font-coolvetica)', fontSize: '1.8rem', color: 'var(--text-purple)', marginBottom: '0.5rem' }}>Privacy</h2>
                  <p style={{ color: 'var(--text-purple)', opacity: 0.6, fontSize: '0.9rem' }}>Control who can see your contact information.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-purple)', marginBottom: '0.25rem' }}>Show Email to Matches</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.6 }}>Allow users who match with your items to see your email address.</p>
                    </div>
                    <Toggle checked={showEmail} onChange={setShowEmail} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-purple)', marginBottom: '0.25rem' }}>Anonymous Reporting</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-purple)', opacity: 0.6 }}>File found item reports anonymously by default.</p>
                    </div>
                    <Toggle checked={anonymousReporting} onChange={setAnonymousReporting} />
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.5rem' }}>
                  {saveMessage && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#2E7D32', fontSize: '0.85rem', fontWeight: 600 }}>
                      <CheckCircle size={16} /> {saveMessage}
                    </span>
                  )}
                  <button onClick={handleSaveProfile} className="btn" style={{ padding: '0.75rem 2rem', opacity: isSaving ? 0.7 : 1 }}>
                    {isSaving ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
