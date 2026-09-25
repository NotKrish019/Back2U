'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Phone, Mail } from 'lucide-react';
import { SectionLabel, Button } from '@/components/ManusUI';
import { Logo } from '@/components/Logo';
import { loginWithEmail, registerWithEmail, signInWithGoogle, setupRecaptcha, requestPhoneCode } from '@/lib/firebase/authService';

export default function LoginPage() {
  const router = useRouter();
  
  // Method States
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [mode, setMode] = useState<"signin" | "create">("signin");
  
  // Email States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Phone States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [appVerifier, setAppVerifier] = useState<any>(null);

  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loginMethod === 'phone' && !appVerifier) {
      const verifier = setupRecaptcha('recaptcha-container');
      setAppVerifier(verifier);
    }
  }, [loginMethod, appVerifier]);

  const handleEmailSubmit = async () => {
    setLoading(true);
    setError(null);
    
    if (mode === 'create' && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    
    const { user, error: authError } = mode === 'create'
      ? await registerWithEmail(email, password)
      : await loginWithEmail(email, password);
      
    if (authError) {
      setError(authError);
      setLoading(false);
    } else if (user) {
      router.push('/');
    }
  };

  const handlePhoneSubmit = async () => {
    setLoading(true);
    setError(null);

    if (!phoneNumber.startsWith('+')) {
      setError('Please include country code (e.g. +1 555-555-5555)');
      setLoading(false);
      return;
    }

    const { confirmationResult: result, error: smsError } = await requestPhoneCode(phoneNumber, appVerifier);
    
    if (smsError) {
      setError(smsError);
      setLoading(false);
    } else {
      setConfirmationResult(result);
      setIsCodeSent(true);
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setLoading(true);
    setError(null);

    try {
      await confirmationResult.confirm(verificationCode);
      router.push('/');
    } catch (err: any) {
      setError('Invalid verification code. Please try again.');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { user, error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError);
      setLoading(false);
    } else if (user) {
      router.push('/');
    }
  };

  return (
    <div className="auth-page">
      <div id="recaptcha-container" style={{ display: 'none' }}></div>
      <div className="auth-art">
        <div className="auth-art-copy">
          <Logo dark />
          <span>GOOD THINGS<br /><em>COME BACK.</em></span>
        </div>
        <div className="auth-art-shape"><span>BACK<br />TO<br />YOU</span></div>
        <small>PRIVATE BY DEFAULT · MADE FOR CAMPUS</small>
      </div>
      <div className="auth-form">
        <button className="auth-back" onClick={() => router.push("/")}><ArrowLeft size={16} />Back to home</button>
        <div className="auth-form-inner">
          <SectionLabel>
            {loginMethod === 'email' 
              ? (mode === "signin" ? "Welcome back" : "Join the campus loop")
              : (isCodeSent ? "Verify code" : "Sign in with phone")}
          </SectionLabel>
          
          <h1>
            {loginMethod === 'email' 
              ? (mode === "signin" ? <>Good to see<br /><em>you again.</em></> : <>Make lost<br /><em>feel found.</em></>)
              : (isCodeSent ? <>Check your<br /><em>messages.</em></> : <>No password<br /><em>needed.</em></>)}
          </h1>
          
          {loginMethod === 'email' && (
            <div className="auth-tabs">
              <button className={mode === "signin" ? "auth-tab-active" : ""} onClick={() => setMode("signin")}>Sign in</button>
              <button className={mode === "create" ? "auth-tab-active" : ""} onClick={() => setMode("create")}>Create account</button>
            </div>
          )}

          {error && <p className="field-error" style={{ marginBottom: '1rem', color: '#b9463f', fontSize: '13px', fontWeight: 600 }}>{error}</p>}
          
          {loginMethod === 'email' && (
            <>
              <label>Campus email
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@university.edu" />
              </label>
              <label>Password
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              </label>
              {mode === "create" && (
                <label>Confirm password
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" />
                </label>
              )}
              <Button onClick={handleEmailSubmit} variant="solid" icon={<ArrowRight size={17} />}>
                {loading ? "Processing..." : mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </>
          )}

          {loginMethod === 'phone' && !isCodeSent && (
            <>
              <label>Mobile number
                <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 555-555-5555" />
              </label>
              <p style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '-15px', marginBottom: '22px' }}>Include country code (e.g. +1)</p>
              <Button onClick={handlePhoneSubmit} variant="solid" icon={<ArrowRight size={17} />}>
                {loading ? "Sending SMS..." : "Send verification code"}
              </Button>
            </>
          )}

          {loginMethod === 'phone' && isCodeSent && (
            <>
              <label>Verification code
                <input type="text" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} placeholder="123456" maxLength={6} style={{ letterSpacing: '0.2em' }} />
              </label>
              <p style={{ fontSize: '11px', color: 'var(--ink-faint)', marginTop: '-15px', marginBottom: '22px' }}>
                Sent to {phoneNumber}. <button onClick={() => setIsCodeSent(false)} style={{ color: 'var(--coral)', background: 'transparent', padding: 0, textDecoration: 'underline' }}>Change</button>
              </p>
              <Button onClick={handleVerifyCode} variant="solid" icon={<ArrowRight size={17} />}>
                {loading ? "Verifying..." : "Verify & sign in"}
              </Button>
            </>
          )}
          
          <div className="auth-divider"><span>or continue with</span></div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loginMethod === 'email' ? (
              <button className="campus-login" onClick={() => setLoginMethod('phone')}>
                <span style={{ background: 'var(--cream)', color: 'var(--ink)' }}><Phone size={13} /></span>
                Sign in with Phone <ArrowRight size={15} />
              </button>
            ) : (
              <button className="campus-login" onClick={() => setLoginMethod('email')}>
                <span style={{ background: 'var(--cream)', color: 'var(--ink)' }}><Mail size={13} /></span>
                Sign in with Email <ArrowRight size={15} />
              </button>
            )}

            <button className="campus-login" onClick={handleGoogleSignIn}>
              <span>G</span>Google single sign-on <ArrowRight size={15} />
            </button>
          </div>

          <p className="auth-legal">By continuing, you agree to Back2U’s Terms and Privacy Policy.</p>
        </div>
      </div>
    </div>
  );
}
