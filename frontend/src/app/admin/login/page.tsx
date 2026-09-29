'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SectionLabel, Button } from '@/components/ManusUI';
import { Logo } from '@/components/Logo';
import { loginWithEmail } from '@/lib/firebase/authService';
import { useAuth } from '@/lib/firebase/AuthContext';

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingState, setLoadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in and is admin, redirect
  if (!loading && user && isAdmin) {
    router.push('/admin');
    return null;
  }

  const handleEmailSubmit = async () => {
    setLoadingState(true);
    setError(null);
    
    const { user, error: authError } = await loginWithEmail(email, password);
      
    if (authError) {
      setError(authError);
      setLoadingState(false);
    } else if (user) {
      // The auth context will handle routing if they are admin, or the layout will block them
      // We push to /admin and let the layout handle the `isAdmin` check
      router.push('/admin');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-art">
        <div className="auth-art-copy">
          <Logo dark />
          <span>STAFF<br /><em>OPERATIONS.</em></span>
        </div>
        <div className="auth-art-shape"><span>BACK<br />TO<br />YOU</span></div>
        <small>AUTHORIZED PERSONNEL ONLY</small>
      </div>
      <div className="auth-form">
        <button className="auth-back" onClick={() => router.push("/")}><ArrowLeft size={16} />Back to home</button>
        <div className="auth-form-inner">
          <SectionLabel>Staff Portal</SectionLabel>
          
          <h1>
            Secure<br /><em>Access.</em>
          </h1>
          
          <p style={{ marginTop: '-10px', marginBottom: '30px', color: 'var(--ink-soft)' }}>
            Sign in with your staff credentials to manage the Back2U operational system.
          </p>

          {error && <p className="field-error" style={{ marginBottom: '1rem', color: '#b9463f', fontSize: '13px', fontWeight: 600 }}>{error}</p>}
          
          <label>Staff email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@university.edu" />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
          </label>
          <Button onClick={handleEmailSubmit} variant="solid" icon={<ArrowRight size={17} />}>
            {loadingState ? "Authenticating..." : "Access Operations Center"}
          </Button>

          <p className="auth-legal" style={{ marginTop: '40px' }}>
            This system is restricted to authorized university staff. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}
