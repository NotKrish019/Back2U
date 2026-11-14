'use client';
import { Suspense, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ImagePlus, ArrowLeft, ArrowRight } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '../lost/ManusUILab';
import { api, ReportCreate } from '@/services/api';
import DatePicker from "react-datepicker";
import "../lost/report.css";
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";

function ReportContent() {
  const router = useRouter();
  // Using static 'found' since this is strictly the /report/found page in UI lab.
  const type: string = 'found';
  
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  
  interface ReportForm {
    item: string;
    details: string;
    location: string;
    date: Date | null;
    image: string;
  }
  const [form, setForm] = useState<ReportForm>({ item: "", details: "", location: "", date: null, image: "" });
  
  const fileRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<DatePicker>(null);
  const labels = ["Item", "Details", "Photo", "Location", "Review"];
  
  const update = (key: keyof ReportForm, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  
  const next = async () => {
    if (step === 0 && !form.item.trim()) {
      setError("Add an item name before continuing.");
      return;
    }
    if (step === 3 && (!form.location.trim() || !form.date)) {
      setError("Please add a location and date before continuing.");
      return;
    }
    setError("");
    
    if (step === 4) {
      setLoading(true);
      try {
        const formData: ReportCreate = {
          report_type: type as "lost" | "found",
          item_category: form.item,
          description: form.details,
          location: `${form.location} (${form.date?.toLocaleString()})`,
          image_reference: form.image
        };
        await api.createReport(formData);

        if (type === 'lost') {
          router.push(`/search?desc=${encodeURIComponent(form.item + ' ' + form.details)}`);
        } else {
          setSubmitted(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          alert(err.message);
        } else {
          alert("An error occurred");
        }
      } finally {
        setLoading(false);
      }
    } else {
      setStep((current) => Math.min(4, current + 1));
    }
  };

  if (submitted) {
    return (
      <>
        <GlobalMeshBackground />
        <div className="success-page animate-step">
          <div className="success-mark"><Check size={33} /></div>
          <SectionLabel>Report submitted</SectionLabel>
          <h1>Nice.<br /><em>It’s on the campus radar.</em></h1>
          <p>Thanks for helping a campus item find its way home. We’ll keep you posted if someone recognises it.</p>
          <div className="success-actions">
            <Button onClick={() => router.push("/reports")} variant="solid">View my reports</Button>
            <Button onClick={() => router.push("/")} variant="outline">Back to home</Button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="page-shell report-page animate-step">
        
        {/* ENTIRE PAGE BACKGROUND: Global Mesh Background */}
        <GlobalMeshBackground />

        {/* UPPER SECTION: Cloudscape + Retro Window */}
        <div className="relative w-full pt-16 pb-16 md:pt-20 md:pb-20 px-6 overflow-hidden">
          <div 
            className="report-bg-wrapper" 
            aria-hidden="true"
            style={{ 
              maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', 
              WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' 
            }}
          >
            <div className="report-bg-sky"></div>
            <div className="report-bg-clouds"></div>
            <div className="report-bg-foreground"></div>
          </div>
          
          <div className="relative z-10 w-full max-w-7xl mx-auto flex justify-start">
            <div className="w-full max-w-[850px] border-2 border-[var(--color-retro-border)] bg-[#F4F1EB]/70 backdrop-blur-md shadow-[6px_6px_0px_#1A1A1A]">
              {/* Window Title Bar */}
              <div className="bg-[#E5E5E5]/90 px-4 py-2 border-b-2 border-[var(--color-retro-border)] flex items-center justify-between" style={{ fontFamily: '"Space Mono", monospace' }}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--color-retro-charcoal)] border border-[var(--color-retro-border)]"></div>
                  <span className="ml-3 text-[11px] font-bold tracking-tight text-[var(--color-retro-charcoal)] uppercase">VISION.MANIFEST</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-deep-purple/70 font-bold">[ READ_ONLY ]</span>
                </div>
              </div>
              
              {/* Window Content - Extracting PageTop to avoid double padding */}
              <div className="p-6 md:p-10 lg:p-12 text-left">
                <div className="inline-flex items-center gap-2 font-['Space_Mono'] text-[10px] tracking-widest uppercase opacity-80 mb-6 text-[var(--report-text-primary)] border border-[var(--color-retro-border)] bg-[#FFD166]/80 px-3 py-1 font-bold">
                  {type === "found" ? "I found something" : "I lost something"}
                </div>
                
                <h1 className="font-['Syne'] text-[clamp(36px,5vw,64px)] leading-[1.05] font-extrabold tracking-tight mb-6 text-[var(--report-text-primary)]">
                  {type === "found" ? <>Help it find<br /><em className="font-['Newsreader'] italic text-[var(--report-accent)] font-semibold">its person.</em></> : <>Tell us what<br /><em className="font-['Newsreader'] italic text-[var(--report-accent)] font-semibold">went missing.</em></>}
                </h1>
                
                <p className="font-['Space_Mono'] text-[14px] tracking-wider uppercase opacity-80 max-w-2xl leading-relaxed text-[var(--report-text-secondary)] font-medium">
                  {type === "found" ? "A few simple details are enough to get the right eyes on it." : "Create a report so new finds can be checked against what you remember."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER SECTION: Report Form */}
        <div className="relative w-full pb-32 z-0 pt-16">
          <section className="report-flow container-wide relative z-10">
          <div className="report-progress">
            {labels.map((label, i) => (
              <button key={label} className={i <= step ? "progress-active" : ""} onClick={() => i < step && setStep(i)}>
                <span>0{i + 1}</span>{label}<i />
              </button>
            ))}
          </div>
          <div className="report-form">
            {step === 0 && (
              <div className="animate-step">
                <SectionLabel>Step 01 / Item</SectionLabel>
                <h2>What {type === "found" ? "did you find" : "went missing"}?</h2>
                <p className="form-intro">A simple name is perfect. You can add the story next.</p>
                <label>Item name <span>Required</span>
                  <input autoFocus value={form.item} onChange={(e) => { update("item", e.target.value); setError(""); }} placeholder={type === "found" ? "e.g. Silver water bottle" : "e.g. Black canvas backpack"} />
                </label>
                {error && <p className="field-error">{error}</p>}
              </div>
            )}
            {step === 1 && (
              <div className="animate-step">
                <SectionLabel>Step 02 / Details</SectionLabel>
                <h2>What should someone notice?</h2>
                <p className="form-intro">Colour, markings, stickers, scuffs — the little things help.</p>
                <label>Description <span>Optional</span>
                  <textarea autoFocus value={form.details} onChange={(e) => update("details", e.target.value)} placeholder="Add a few details that make this item recognisable..." />
                </label>
              </div>
            )}
            {step === 2 && (
              <div className="animate-step">
                <SectionLabel>Step 03 / Photo</SectionLabel>
                <h2>Show us the item.</h2>
                <p className="form-intro">A clear photo makes the report much easier to recognise.</p>
                <div className={`report-upload ${form.image ? "has-report-image" : ""}`} onClick={() => fileRef.current?.click()}>
                  {form.image ? (
                    <img src={form.image} alt="Report preview" />
                  ) : (
                    <>
                      <ImagePlus size={28} />
                      <b>Add a photo</b>
                      <span>Optional, but helpful</span>
                    </>
                  )}
                  <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { 
                    const f = e.target.files?.[0]; 
                    if (f) {
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        update("image", reader.result as string);
                      };
                      reader.readAsDataURL(f);
                    }
                  }} />
                </div>
                {!form.image && (
                   <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                     <button type="button" className="btn btn-outline" style={{ fontSize: '12px' }} onClick={() => {
                       const url = prompt("Enter image URL for demo:");
                       if (url) update("image", url);
                     }}>
                       OR PROVIDE URL
                     </button>
                   </div>
                )}
              </div>
            )}
            {step === 3 && (
              <div className="animate-step">
                <SectionLabel>Step 04 / Location</SectionLabel>
                <h2>Where did it happen?</h2>
                <p className="form-intro">Choose the closest campus spot and an approximate date.</p>
                <label>Location <span>Required</span>
                  <input 
                    autoFocus 
                    type="text" 
                    value={form.location} 
                    onChange={(e) => { update("location", e.target.value); setError(""); }} 
                    placeholder="e.g. Library, Cafe" 
                  />
                </label>
                <label>When? <span>Required</span>
                  <DatePicker 
                    selected={form.date} 
                    onChange={(d: Date | null) => { update("date", d); setError(""); }} 
                    showTimeInput
                    timeInputLabel="Time:"
                    dateFormat="dd/MM/yyyy, h:mm aa"
                    placeholderText="Select date and time"
                    ref={datePickerRef}
                    shouldCloseOnSelect={false}
                    customInput={
                      <input style={{ width: '100%', cursor: 'pointer' }} readOnly />
                    }
                  >
                    <div style={{ padding: '8px', textAlign: 'right', borderTop: '1px solid rgba(0,0,0,0.1)', marginTop: '8px' }}>
                      <button 
                        onClick={() => datePickerRef.current?.setOpen(false)}
                        style={{ padding: '6px 16px', background: 'var(--report-accent)', color: 'var(--report-text-primary)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                        OK
                      </button>
                    </div>
                  </DatePicker>
                </label>
                {error && <p className="field-error">{error}</p>}
              </div>
            )}
            {step === 4 && (
              <div className="animate-step">
                <SectionLabel>Step 05 / Review</SectionLabel>
                <h2>Ready to put it<br /><em>on the radar?</em></h2>
                <div className="review-list">
                  <div><span>ITEM</span><b>{form.item || "Untitled item"}</b></div>
                  <div><span>DETAILS</span><b>{form.details || "No extra detail added"}</b></div>
                  <div><span>WHERE / WHEN</span><b>{form.location || "Unknown"} · {form.date ? form.date.toLocaleString() : "Unknown"}</b></div>
                  <div><span>PHOTO</span><b>{form.image ? "Attached" : "No photo"}</b></div>
                </div>
              </div>
            )}
            <div className="report-actions">
              {step > 0 && <Button onClick={() => setStep(step - 1)} variant="text" icon={<ArrowLeft size={16} />}>Back</Button>}
              <Button onClick={next} variant="solid" icon={<ArrowRight size={17} />}>
                {loading ? "Submitting..." : step === 4 ? `Submit ${type === "found" ? "found" : "lost"}-item report` : "Continue"}
              </Button>
            </div>
          </div>
        </section>
        </div>
      </div>

    </>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="page-shell"><div style={{padding: '40px', fontFamily: '"Space Mono", monospace', textTransform: 'uppercase', fontSize: '12px'}}>Loading...</div></div>}>
      <ReportContent />
    </Suspense>
  );
}
