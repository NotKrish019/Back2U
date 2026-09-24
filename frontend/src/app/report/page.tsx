'use client';
import { Suspense, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ImagePlus, ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';
import { api, ReportCreate } from '../../services/api';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') === 'lost' ? 'lost' : 'found';
  
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
  
  const update = (key: keyof ReportForm, value: any) => setForm((current) => ({ ...current, [key]: value }));
  
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
          report_type: type,
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
      } catch (err: any) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setStep((current) => Math.min(4, current + 1));
    }
  };

  if (submitted) {
    return (
      <div className="success-page">
        <div className="success-mark"><Check size={33} /></div>
        <SectionLabel>Report submitted</SectionLabel>
        <h1>Nice.<br /><em>It’s on the campus radar.</em></h1>
        <p>Thanks for helping a campus item find its way home. We’ll keep you posted if someone recognises it.</p>
        <div className="success-actions">
          <Button onClick={() => router.push("/my-reports")} variant="solid">View my reports</Button>
          <Button onClick={() => router.push("/")} variant="outline">Back to home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell report-page">
      <PageTop 
        eyebrow={type === "found" ? "I found something" : "I lost something"} 
        title={type === "found" ? <>Help it find<br /><em>its person.</em></> : <>Tell us what<br /><em>went missing.</em></>} 
        intro={type === "found" ? "A few simple details are enough to get the right eyes on it." : "Create a report so new finds can be checked against what you remember."} 
      />
      <section className="report-flow container-wide">
        <div className="report-progress">
          {labels.map((label, i) => (
            <button key={label} className={i <= step ? "progress-active" : ""} onClick={() => i < step && setStep(i)}>
              <span>0{i + 1}</span>{label}<i />
            </button>
          ))}
        </div>
        <div className="report-form">
          {step === 0 && (
            <>
              <SectionLabel>Step 01 / Item</SectionLabel>
              <h2>What {type === "found" ? "did you find" : "went missing"}?</h2>
              <p className="form-intro">A simple name is perfect. You can add the story next.</p>
              <label>Item name <span>Required</span>
                <input autoFocus value={form.item} onChange={(e) => { update("item", e.target.value); setError(""); }} placeholder={type === "found" ? "e.g. Silver water bottle" : "e.g. Black canvas backpack"} />
              </label>
              {error && <p className="field-error">{error}</p>}
            </>
          )}
          {step === 1 && (
            <>
              <SectionLabel>Step 02 / Details</SectionLabel>
              <h2>What should someone notice?</h2>
              <p className="form-intro">Colour, markings, stickers, scuffs — the little things help.</p>
              <label>Description <span>Optional</span>
                <textarea autoFocus value={form.details} onChange={(e) => update("details", e.target.value)} placeholder="Add a few details that make this item recognisable..." />
              </label>
            </>
          )}
          {step === 2 && (
            <>
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
                  // Fallback for demo URL entry if file upload is complex, but we'll try data URL
                  const f = e.target.files?.[0]; 
                  if (f) update("image", URL.createObjectURL(f)); 
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
            </>
          )}
          {step === 3 && (
            <>
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
                  onChange={(d) => { update("date", d); setError(""); }} 
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
                  <div style={{ padding: '8px', textAlign: 'right', borderTop: '1px solid #eee', marginTop: '8px' }}>
                    <button 
                      onClick={() => datePickerRef.current?.setOpen(false)}
                      style={{ padding: '6px 16px', background: 'var(--coral)', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}>
                      OK
                    </button>
                  </div>
                </DatePicker>
              </label>
              {error && <p className="field-error">{error}</p>}
            </>
          )}
          {step === 4 && (
            <>
              <SectionLabel>Step 05 / Review</SectionLabel>
              <h2>Ready to put it<br /><em>on the radar?</em></h2>
              <div className="review-list">
                <div><span>ITEM</span><b>{form.item || "Untitled item"}</b></div>
                <div><span>DETAILS</span><b>{form.details || "No extra detail added"}</b></div>
                <div><span>WHERE / WHEN</span><b>{form.location || "Unknown"} · {form.date ? form.date.toLocaleString() : "Unknown"}</b></div>
                <div><span>PHOTO</span><b>{form.image ? "Attached" : "No photo"}</b></div>
              </div>
            </>
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
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="page-shell">Loading...</div>}>
      <ReportContent />
    </Suspense>
  );
}
