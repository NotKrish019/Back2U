'use client';
import { useState, useEffect, useRef, ReactNode } from 'react';

const useContainerDimensions = (ref: React.RefObject<HTMLElement | null>) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const observeTarget = ref.current;
    if (!observeTarget) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    resizeObserver.observe(observeTarget);
    return () => resizeObserver.unobserve(observeTarget);
  }, [ref]);
  return dimensions;
};
import {
  IdCard,
  Key,
  Smartphone,
  Wallet,
  Headphones,
  Backpack,
  Cloud,
  Eye,
  EyeOff,
  Phone
} from 'lucide-react';
import { OrbitingCircles } from '@/components/ui/modern-animated-sign-in';
import { CloudShader } from '@/components/ui/cloud-shader';

import Image from 'next/image';

type IconConfig = {
  imageSrc: string;
  duration?: number;
  delay?: number;
  radius?: number;
  reverse?: boolean;
};

const colors = {
  sky: '#A7D8F5',
  lavender: '#C5B5E8',
  deepPurple: '#3D315B',
  white: '#FFFFFF',
  pink: '#F29BB2',
};

const lostFoundItems: IconConfig[] = [
  {
    imageSrc: '/icons/keys.jpg',
    radius: 75, duration: 12, delay: 0, reverse: false,
  },
  {
    imageSrc: '/icons/wallet.jpg',
    radius: 125, duration: 15, delay: 0, reverse: true,
  },
  {
    imageSrc: '/icons/phone.jpg',
    radius: 175, duration: 17, delay: 0, reverse: false,
  },
  {
    imageSrc: '/icons/headphones.jpg',
    radius: 225, duration: 20, delay: 0, reverse: true,
  },
  {
    imageSrc: '/icons/bottle.jpg',
    radius: 275, duration: 23, delay: 0, reverse: false,
  },
  {
    imageSrc: '/icons/backpack.jpg',
    radius: 325, duration: 26, delay: 0, reverse: true,
  },
];



const LostFoundOrbitDisplay = ({ scale = 1 }: { scale?: number }) => {
  return (
    <section className='relative flex h-full w-full flex-col items-center justify-center overflow-hidden z-10'>
      
      {/* Subtle Glow Behind Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[2]">
        <div className="w-[350px] h-[350px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(197,181,232,0.30), transparent 65%)' }} />
      </div>

      <div className="z-[5] flex flex-col items-center justify-center select-none pointer-events-none mt-2">
        <h2 className="font-[Syne] font-[800] text-[#3D315B] tracking-[-0.09em] flex items-center gap-[1px]" style={{ fontSize: 'clamp(32px, 5vw, 72px)', margin: 0, lineHeight: 1 }}>
          BACK<span className="align-super font-extrabold text-[#F29BB2]" style={{ fontSize: '0.6em', marginTop: '-0.3em', transform: 'rotate(-8deg)', display: 'inline-block' }}>2</span>U
        </h2>
        <span className="font-[DM Mono] uppercase tracking-[0.15em] text-[#202124]/70 mt-2 font-semibold" style={{ fontSize: 'clamp(9px, 1.5vw, 12px)' }}>
          Find What Matters
        </span>
      </div>

      <div className="absolute z-[3] inset-0 flex items-center justify-center">
        {lostFoundItems.map((item, index) => {
          const r = item.radius! * scale;
          return (
            <div key={`path-${index}`} className="absolute rounded-full border border-[#3D315B]/15" style={{ width: r * 2, height: r * 2 }} />
          );
        })}
      </div>

      <div className="absolute z-[4] inset-0 flex items-center justify-center">
        {lostFoundItems.map((item, index) => {
          const r = item.radius! * scale;
          return (
            <OrbitingCircles
              key={index}
              className="border-none bg-transparent"
              radius={r}
              duration={item.duration}
              delay={item.delay}
              reverse={item.reverse}
              path={false}
            >
              <div className="flex items-center justify-center rounded-full bg-[#f7f1e7] shadow-[0_4px_20px_rgba(61,49,91,0.08)] transition-transform duration-300 hover:scale-110 cursor-pointer overflow-hidden border-2 border-white" style={{ width: 'clamp(28px, 4vw, 40px)', height: 'clamp(28px, 4vw, 40px)' }}>
                <div className="relative w-full h-full rounded-full overflow-hidden mix-blend-multiply">
                  <Image src={item.imageSrc} alt="Lost and Found item" fill className="object-cover" />
                </div>
              </div>
            </OrbitingCircles>
          );
        })}
      </div>
    </section>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const { width, height } = useContainerDimensions(leftPanelRef);

  // Scale orbits so the largest (325px radius = 650px diameter) never exceeds 82% of the panel's min dimension.
  const minDimension = Math.min(width, height);
  const maxAllowedRadius = minDimension > 0 ? (minDimension * 0.41) : 325;
  const scale = minDimension > 0 ? Math.min(maxAllowedRadius / 325, 1) : 1;

  return (
    <section 
      className='flex flex-col lg:flex-row w-full font-[DM Sans] overflow-hidden bg-white box-border' 
      style={{ height: '100dvh', paddingTop: '76px' }}
    >
      
      {/* Left Side - Hero Section */}
      <div ref={leftPanelRef} className="hidden lg:flex w-1/2 relative items-center justify-center overflow-hidden">
        <CloudShader 
          className="absolute inset-0" 
          speed={0.5} 
          skyTopColor="#A7D8F5" 
          skyBottomColor="#C5B5E8" 
          cloudColor="#FFFFFF" 
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
          <LostFoundOrbitDisplay scale={scale} />
        </div>
        
        {/* Seamless Blend Gradient to Right Panel */}
        <div className="absolute inset-y-0 right-0 w-[15%] lg:w-[200px] bg-gradient-to-r from-transparent to-white z-20 pointer-events-none" />
      </div>

      {/* Right Side - Form */}
      <div className='flex w-full lg:w-1/2 p-[clamp(20px,4vh,48px)] relative overflow-y-auto bg-white items-center justify-center box-border'>
        <div className='relative z-10 w-full max-w-[440px] p-[clamp(24px,4vh,40px)] rounded-[24px] bg-white border border-[#C5B5E8]/35 shadow-[0_8px_30px_rgba(61,49,91,0.06)] box-border flex flex-col max-h-full overflow-y-auto'>
          
          {/* Header */}
          <div className='mb-[clamp(20px,3vh,32px)] shrink-0'>
            <h1 className='text-[#3D315B] font-[Syne] font-bold tracking-[-0.05em] leading-tight mb-2' style={{ fontSize: 'clamp(28px, 4vh, 36px)' }}>
              Welcome back
            </h1>
            <p className='text-[#202124]/70 text-[15px]'>
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form className='flex flex-col gap-5' onSubmit={(e) => e.preventDefault()}>
            <div className='flex flex-col gap-2'>
              <label className='text-[#202124] text-[13px] font-medium'>Email</label>
              <input
                type='email'
                placeholder='you@university.edu'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className='h-[48px] rounded-[10px] bg-[#A7D8F5]/15 border border-[#C5B5E8] px-4 text-[#202124] text-[15px] placeholder:text-[#202124]/40 focus:outline-none focus:border-[#3D315B] focus:ring-2 focus:ring-[#C5B5E8]/30 transition-all'
              />
            </div>
            
            <div className='flex flex-col gap-2 relative'>
              <label className='text-[#202124] text-[13px] font-medium'>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder='Enter your password'
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='h-[48px] w-full rounded-[10px] bg-[#A7D8F5]/15 border border-[#C5B5E8] pl-4 pr-11 text-[#202124] text-[15px] placeholder:text-[#202124]/40 focus:outline-none focus:border-[#3D315B] focus:ring-2 focus:ring-[#C5B5E8]/30 transition-all'
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3D315B]/50 hover:text-[#3D315B] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-[13px] font-medium text-[#3D315B] hover:text-[#F29BB2] transition-colors">
                Forgot password?
              </button>
            </div>

            <button
              type='submit'
              className='h-[48px] mt-2 rounded-[10px] bg-[#3D315B] text-white font-medium text-[15px] transition-all hover:bg-[#F29BB2] hover:-translate-y-[1px] hover:shadow-lg focus:ring-2 focus:ring-[#F29BB2] flex items-center justify-center gap-2'
            >
              Sign in
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-[1px] bg-[#C5B5E8]/40"></div>
            <span className="text-[11px] font-[DM Mono] uppercase tracking-wider text-[#3D315B]/60">OR</span>
            <div className="flex-1 h-[1px] bg-[#C5B5E8]/40"></div>
          </div>

          {/* Social Logins */}
          <div className="flex flex-col gap-3">
            <button className="h-[clamp(44px,6vh,48px)] shrink-0 flex items-center justify-center gap-3 rounded-[10px] border border-[#C5B5E8]/60 bg-white hover:bg-[#A7D8F5]/10 hover:border-[#A7D8F5] transition-all text-[#202124] text-[14px] font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
            <button className="h-[clamp(44px,6vh,48px)] shrink-0 flex items-center justify-center gap-3 rounded-[10px] border border-[#C5B5E8]/60 bg-white hover:bg-[#A7D8F5]/10 hover:border-[#A7D8F5] transition-all text-[#202124] text-[14px] font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#3D315B]">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              Continue with mobile number
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-[14px] text-[#202124]/70">
              Don't have an account? <button className="font-semibold text-[#3D315B] hover:text-[#F29BB2] transition-colors">Create account</button>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
