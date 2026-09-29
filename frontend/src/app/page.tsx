'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownRight, ArrowRight, ArrowUpRight, LocateFixed, ImagePlus, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { SectionLabel, Button } from '@/components/ManusUI';
import { motion, AnimatePresence } from 'framer-motion';

function SearchLens({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setOffset({ x: (e.clientX - box.left - box.width / 2) / 22, y: (e.clientY - box.top - box.height / 2) / 22 });
  };
  
  return (
    <div ref={ref} className={`search-lens ${hovered ? "lens-hovered" : ""}`} onMouseMove={onMove} onMouseLeave={() => { setOffset({ x: 0, y: 0 }); setHovered(false); }} onMouseEnter={() => setHovered(true)} onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}>
      <div className="lens-paper" style={{ transform: `translate3d(${offset.x}px, ${offset.y}px, 0)` }}>
        <span className="lens-kicker">SEARCH LENS <i>•</i> 01</span>
        <div className="lens-center-copy"><span>POSSIBLE</span><strong>MATCH</strong></div>
        <div className="lens-ring ring-one" /><div className="lens-ring ring-two" />
        <span className="lens-tag tag-photo">PHOTO <ImagePlus size={12} /></span>
        <span className="lens-tag tag-description">DESCRIPTION <MessageCircle size={12} /></span>
        <span className="lens-tag tag-location">LOCATION <LocateFixed size={12} /></span>
        <span className="lens-line line-a" /><span className="lens-line line-b" /><span className="lens-line line-c" />
        <span className="lens-arrow">↘</span>
        <span className="lens-coordinates">43°39'12.2"N<br />79°23'40.8"W</span>
      </div>
      <div className="lens-cta">START SEARCH <ArrowUpRight size={15} /></div>
    </div>
  );
}
function AnimatedHeroFootnote() {
  const items = ["keys", "wallet", "favorite jacket", "headphones", "student ID"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hero-footnote" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: '12px', height: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: 'absolute', width: '10px', height: '10px', backgroundColor: 'var(--coral, #f05a4f)', borderRadius: '50%' }}
        />
        <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--coral, #f05a4f)', borderRadius: '50%', zIndex: 1 }} />
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        Reuniting you with your
        <div style={{ position: 'relative', width: '130px', height: '24px', overflow: 'hidden' }}>
          <AnimatePresence mode="popLayout">
            <motion.b
              key={items[index]}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ position: 'absolute', left: 4, top: 0, color: 'var(--coral, #f05a4f)' }}
            >
              {items[index]}
            </motion.b>
          </AnimatePresence>
        </div>
      </span>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 2500);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStepClick = (i: number) => {
    setActiveStep(i);
    startTimer();
  };
  
  return (
    <div className="home-page">
      <section className="hero-section">
        <motion.div 
          className="hero-copy"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
          }}
        >
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}>
            <SectionLabel>Campus lost & found <span className="label-chip">EST. 2026</span></SectionLabel>
          </motion.div>
          <motion.h1 variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}>
            LOST<br />SOMETHING?<br />
            <span style={{ display: 'block', marginTop: '0.3em' }}><em>LET'S GET<br />IT BACK2U.</em></span>
          </motion.h1>
          <motion.p variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}>
            Find what belongs to you — or help return what someone else lost.
          </motion.p>
          <motion.div className="hero-actions" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}>
            <Button onClick={() => router.push("/search")} variant="solid" icon={<ArrowRight size={17} />}>I LOST SOMETHING</Button>
            <Button onClick={() => router.push("/report?type=found")} variant="outline" icon={<ArrowUpRight size={16} />}>I FOUND SOMETHING</Button>
          </motion.div>
          <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } } }}>
            <AnimatedHeroFootnote />
          </motion.div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <SearchLens onClick={() => router.push("/search")} />
        </motion.div>
        <div className="hero-side-note"><span>SCROLL TO EXPLORE</span><ArrowDownRight size={20} /></div>
      </section>

      <section className="choice-section container-wide">
        <div className="choice-intro">
          <SectionLabel>Your next move</SectionLabel>
          <h2>Two paths.<br /><em>One good feeling.</em></h2>
          <p>Whether you’re retracing your steps or picking up someone else’s, Back2U keeps the next step simple.</p>
        </div>
        <div className="choice-list">
          <button className="choice-row choice-row-coral" onClick={() => router.push("/search")}>
            <span className="choice-number">01</span>
            <div>
              <h3>I LOST SOMETHING</h3>
              <p>Find it</p>
            </div>
            <ArrowRight className="choice-arrow" size={22} />
          </button>
          <button className="choice-row choice-row-yellow" onClick={() => router.push("/report?type=found")}>
            <span className="choice-number">02</span>
            <div>
              <h3>I FOUND SOMETHING</h3>
              <p>Help return it</p>
            </div>
            <ArrowRight className="choice-arrow" size={22} />
          </button>
        </div>
      </section>

      <section className="signal-strip">
        <div className="signal-label"><span className="live-dot" />Campus signal</div>
        <div className="signal-marquee">
          <span>12 NEW REPORTS TODAY</span><i>·</i>
          <span>48 ITEMS FOUND THIS WEEK</span><i>·</i>
          <span>3 RECENTLY RETURNED</span><i>·</i>
          <span>12 NEW REPORTS TODAY</span>
        </div>
        <button onClick={() => router.push("/search")}><span>See campus activity</span><ArrowUpRight size={15} /></button>
      </section>

      <section className="how-section container-wide">
        <div className="how-head">
          <SectionLabel>How it works</SectionLabel>
          <h2>Less searching.<br /><em>More finding.</em></h2>
          <p>Back2U uses the details you remember to narrow down the things you don’t.</p>
        </div>
        <div className="steps-layout">
          <div className="steps-rail">
            {["SHOW US THE ITEM", "TELL US WHAT YOU REMEMBER", "REVIEW POSSIBLE MATCHES"].map((s, i) => (
              <button key={s} className={activeStep === i ? "step-active" : ""} onClick={() => {
                document.getElementById(`step-${i}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}>
                <span>0{i + 1}</span><b>{s}</b><i />
              </button>
            ))}
          </div>
          <div className="step-features">
            {[0, 1, 2].map((i) => (
              <motion.div 
                key={i} 
                id={`step-${i}`}
                className="step-feature"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ margin: "-40% 0px -40% 0px" }}
                onViewportEnter={() => setActiveStep(i)}
                transition={{ duration: 0.6, ease: "easeOut" }}
              >
                <img src={[`/mocks/step1.jpg`, `/mocks/step2.jpg`, `/mocks/step3.jpg`][i]} alt="Campus discovery detail" />
                <div className="step-feature-copy">
                  <span>0{i + 1}</span>
                  <h3>{["Show us the item", "Tell us what you remember", "Review possible matches"][i]}</h3>
                  <p>{["Start with a quick photo. It doesn’t have to be perfect.", "Add a place, a date, a colour — anything that helps.", "A short list of possible matches, explained like a human."][i]}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="privacy-band">
        <div className="privacy-stamp" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
          <Sparkles size={24} color="var(--yellow)" />
          <span style={{ color: 'var(--cream)' }}>AI-POWERED<br />MATCHING</span>
        </div>
        <div>
          <SectionLabel light>The smart way to search</SectionLabel>
          <h2 style={{ minHeight: '120px' }}>
            We'll help you find<br />your <em style={{ display: 'inline-block', position: 'relative' }}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={["keys", "wallet", "student ID", "backpack", "headphones", "water bottle"][activeStep % 6]}
                  initial={{ y: 30, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -30, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  style={{ position: 'absolute', left: 0, whiteSpace: 'nowrap' }}
                >
                  {["keys", "wallet", "student ID", "backpack", "headphones", "water bottle"][activeStep % 6]}.
                </motion.span>
              </AnimatePresence>
              <span style={{ opacity: 0 }}>water bottle.</span>
            </em>
          </h2>
          <p>Our multimodal AI analyzes your photos and descriptions to instantly spot matches across the entire campus network.</p>
        </div>
        <Button onClick={() => router.push("/search")} variant="dark" icon={<ArrowUpRight size={16} />}>Try it now</Button>
      </section>

      <section className="home-bottom container-wide">
        <div>
          <SectionLabel>Need a hand?</SectionLabel>
          <h2>Let’s get it<br /><em>back2u.</em></h2>
        </div>
        <div className="bottom-links">
          <button onClick={() => router.push("/search")}><span>Start a search</span><ArrowRight size={18} /></button>
          <button onClick={() => router.push("/report?type=found")}><span>Report something found</span><ArrowRight size={18} /></button>
          <button onClick={() => router.push("/map")}><span>View hotspots</span><ArrowRight size={18} /></button>
        </div>
      </section>
    </div>
  );
}
