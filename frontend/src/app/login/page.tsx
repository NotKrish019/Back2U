'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, Mail } from 'lucide-react';
import { loginWithEmail, registerWithEmail, signInWithGoogle, setupRecaptcha, requestPhoneCode } from '@/lib/firebase/authService';

export default function LoginPage() {
  const router = useRouter();
  
  // Method States
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Email States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [appVerifier, setAppVerifier] = useState<any>(null);

  // Status States
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize reCAPTCHA when switching to Phone method
  useEffect(() => {
    if (loginMethod === 'phone' && !appVerifier) {
      const verifier = setupRecaptcha('recaptcha-container');
      setAppVerifier(verifier);
    }
  }, [loginMethod, appVerifier]);

  // Handle Email Submit
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { user, error } = isSignUp 
      ? await registerWithEmail(email, password)
      : await loginWithEmail(email, password);

    if (error) {
      setError(error);
      setLoading(false);
    } else if (user) {
      router.push('/');
    }
  };

  // Handle Request Phone OTP
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simple validation
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

  // Handle Verify OTP Code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
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
    const { user, error } = await signInWithGoogle();
    if (error) {
      setError(error);
      setLoading(false);
    } else if (user) {
      router.push('/');
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      {/* Hidden div for Firebase Recaptcha */}
      <div id="recaptcha-container"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '420px', backgroundColor: 'var(--white)', padding: '3rem 2.5rem', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)', border: '1px solid var(--border-color)', overflow: 'hidden' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span className="subheading" style={{ marginBottom: '0.5rem' }}>WELCOME BACK</span>
          <h1 className="heading-md" style={{ fontSize: '2.5rem', margin: 0 }}>
            {loginMethod === 'email' ? (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN') : (isCodeSent ? 'ENTER CODE' : 'SIGN IN WITH PHONE')}
          </h1>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(240, 92, 85, 0.1)', color: 'var(--accent-red)', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 500 }}>
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {loginMethod === 'email' && (
            <motion.form 
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleEmailSubmit} 
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div>
                <label className="input-label">EMAIL <span>*</span></label>
                <input 
                  type="email" 
                  className="input" 
                  placeholder="you@university.edu" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>
              <div>
                <label className="input-label">PASSWORD <span>*</span></label>
                <input 
                  type="password" 
                  className="input" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', padding: '1rem' }}
                disabled={loading}
              >
                {loading ? 'PROCESSING...' : (isSignUp ? 'REGISTER' : 'LOG IN')}
              </button>
            </motion.form>
          )}

          {loginMethod === 'phone' && !isCodeSent && (
            <motion.form 
              key="phone-request-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              onSubmit={handlePhoneSubmit} 
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div>
                <label className="input-label">MOBILE NUMBER <span>*</span></label>
                <input 
                  type="tel" 
                  className="input" 
                  placeholder="+1 555-555-5555" 
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required 
                />
                <span style={{ fontSize: '0.75rem', color: '#8C8797', marginTop: '0.5rem', display: 'block' }}>Must include country code (e.g. +1 for US/Canada)</span>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', padding: '1rem' }}
                disabled={loading}
              >
                {loading ? 'SENDING SMS...' : 'SEND VERIFICATION CODE'}
              </button>
            </motion.form>
          )}

          {loginMethod === 'phone' && isCodeSent && (
            <motion.form 
              key="phone-verify-form"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleVerifyCode} 
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-purple)', opacity: 0.8, margin: 0 }}>
                  We sent a 6-digit code to <strong>{phoneNumber}</strong>
                </p>
                <button 
                  type="button" 
                  onClick={() => setIsCodeSent(false)} 
                  style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem', textDecoration: 'underline' }}
                >
                  Change phone number
                </button>
              </div>
              <div>
                <label className="input-label">VERIFICATION CODE <span>*</span></label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="123456" 
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontWeight: 700 }}
                  required 
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '0.5rem', padding: '1rem' }}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? 'VERIFYING...' : 'VERIFY & SIGN IN'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Divider */}
        {(!isCodeSent) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '2rem 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '0.75rem', color: '#8C8797', fontWeight: 600, letterSpacing: '0.05em' }}>OR CONTINUE WITH</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>
        )}

        {(!isCodeSent) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loginMethod === 'email' ? (
              <button 
                onClick={() => setLoginMethod('phone')}
                type="button" 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '1rem', display: 'flex', gap: '0.75rem' }}
                disabled={loading}
              >
                <Phone size={18} color="var(--text-purple)" />
                PHONE NUMBER
              </button>
            ) : (
              <button 
                onClick={() => setLoginMethod('email')}
                type="button" 
                className="btn btn-outline" 
                style={{ width: '100%', padding: '1rem', display: 'flex', gap: '0.75rem' }}
                disabled={loading}
              >
                <Mail size={18} color="var(--text-purple)" />
                EMAIL
              </button>
            )}

            <button 
              onClick={handleGoogleSignIn}
              type="button" 
              className="btn btn-outline" 
              style={{ width: '100%', padding: '1rem', display: 'flex', gap: '0.75rem' }}
              disabled={loading}
            >
              {/* Simple Google SVG icon */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.67 15.63 16.89 16.81 15.74 17.58V20.34H19.31C21.4 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.31 20.34L15.74 17.58C14.74 18.25 13.48 18.66 12 18.66C9.14 18.66 6.71 16.73 5.84 14.14H2.15V16.99C4.01 20.67 7.72 23 12 23Z" fill="#34A853"/>
                <path d="M5.84 14.14C5.62 13.48 5.49 12.76 5.49 12C5.49 11.24 5.62 10.52 5.84 9.86V7.01H2.15C1.39 8.52 0.96 10.22 0.96 12C0.96 13.78 1.39 15.48 2.15 16.99L5.84 14.14Z" fill="#FBBC05"/>
                <path d="M12 5.34C13.62 5.34 15.06 5.89 16.2 6.98L19.38 3.8C17.45 2 14.97 0.96 12 0.96C7.72 0.96 4.01 3.33 2.15 7.01L5.84 9.86C6.71 7.27 9.14 5.34 12 5.34Z" fill="#EA4335"/>
              </svg>
              GOOGLE
            </button>
          </div>
        )}

        {loginMethod === 'email' && (
          <div style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-purple)' }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              style={{ background: 'none', border: 'none', color: 'var(--accent-red)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
