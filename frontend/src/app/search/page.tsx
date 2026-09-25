'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, ImagePlus, Sparkles, ArrowRight, Filter, ArrowLeft, ZoomIn, ArrowUpRight, ShieldCheck, CircleHelp } from 'lucide-react';
import { SectionLabel, PageTop, Button } from '@/components/ManusUI';
import { api, RetrievalResult } from '../../services/api';
import Link from 'next/link';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

function ResultCard({ item, primary = false, onClick }: { item: any; primary?: boolean; onClick: () => void }) {
  // item is the API result
  return (
    <button className={`result-card ${primary ? "result-primary" : ""}`} onClick={onClick}>
      <div className="result-image">
        <img src={item.image_url || "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1100&q=85"} alt="Result" />
        <span className={`match-tag tag-${primary ? 'coral' : 'yellow'}`}>{item.similarity_score > 0.8 ? "Strong match" : "Possible match"}</span>
        <span className="zoom-hint"><ZoomIn size={14} /></span>
      </div>
      <div className="result-card-body">
        <div>
          <span className="result-kicker">{primary ? "TOP MATCH" : "ANOTHER POSSIBILITY"}</span>
          <h3>{item.item_instance_id}</h3>
        </div>
        <ArrowUpRight size={18} />
        <p>{(item.similarity_score * 100).toFixed(0)}% Match</p>
      </div>
    </button>
  );
}

function SearchFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('desc') || '';
  
  const [view, setView] = useState<'find' | 'searching' | 'results'>(initialQuery ? 'searching' : 'find');
  const [image, setImage] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState(initialQuery);
  const [location, setSearchLocation] = useState("");
  const [date, setDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<{name?: boolean, desc?: boolean, loc?: boolean, date?: boolean}>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const datePickerRef = useRef<DatePicker>(null);
  
  const [progress, setProgress] = useState(12);
  const [result, setResult] = useState<RetrievalResult | null>(null);
  const [filter, setFilter] = useState("All");

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setImage(URL.createObjectURL(file)); };

  const handleSearch = () => {
    const newErrors = {
      name: !itemName.trim(),
      desc: !description.trim(),
      loc: !location.trim(),
      date: !date
    };
    setErrors(newErrors);
    
    if (!newErrors.name && !newErrors.desc && !newErrors.loc && !newErrors.date) {
      setView('searching');
    }
  };

  const [reportCreated, setReportCreated] = useState(false);

  useEffect(() => {
    if (view === 'searching') {
      const interval = window.setInterval(() => setProgress((p) => Math.min(95, p + 7)), 150);
      
      const executeSearchAndReport = async () => {
        try {
          // If the user filled out the form (itemName exists) and we haven't created a report yet
          if (itemName.trim() && !reportCreated) {
            const formData = {
              report_type: 'lost' as const,
              item_category: itemName,
              description: description,
              location: `${location} (${date?.toLocaleString()})`,
              image_reference: image || ""
            };
            await api.createReport(formData);
            setReportCreated(true);
          }
          
          const res = await api.search({ text: description, top_k: 6 });
          setResult(res);
          setProgress(100);
          setTimeout(() => setView('results'), 500);
        } catch (err: any) {
          alert(err.message);
          setView('find');
        } finally {
          clearInterval(interval);
        }
      };

      executeSearchAndReport();
      
      return () => clearInterval(interval);
    }
  }, [view, itemName, description, location, date, image, reportCreated]);

  if (view === 'find') {
    return (
      <div className="page-shell">
        <PageTop 
          eyebrow="I lost something" 
          title={<>Show us what<br /><em>you remember.</em></>} 
          intro="A photo helps, but it’s not required. Start wherever your memory feels clearest." 
          action={<div className="flow-chip"><span>01</span><b>SEARCH</b><i />02 RESULTS<i />03 REVIEW</div>} 
        />
        <section className="find-layout container-wide">
          <div className="upload-panel">
            <div className={`upload-zone ${image ? "upload-filled" : ""}`} onClick={() => fileRef.current?.click()}>
              {image ? (
                <>
                  <img src={image} alt="Your uploaded item" />
                  <div className="upload-overlay"><span>Change photo</span><ImagePlus size={16} /></div>
                </>
              ) : (
                <>
                  <div className="upload-icon"><ImagePlus size={25} /></div>
                  <h3>Add a photo</h3>
                  <p>Drop an image here or browse your camera roll.</p>
                  <span className="upload-help">JPG, PNG · MAX 10MB</span>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} hidden />
            <div className="upload-caption"><Sparkles size={14} /><span>Images stay private until you choose to contact someone.</span></div>
          </div>
          <div className="form-panel">
            <div className="form-heading"><span>Start with words</span><h2>What do you remember?</h2></div>
            <label style={{ fontSize: '15px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Item name <span style={{ color: 'var(--coral)', fontSize: '18px', lineHeight: 1 }}>*</span></div>
              <input 
                type="text" 
                value={itemName} 
                onChange={(e) => {
                  setItemName(e.target.value);
                  if (errors.name) setErrors(prev => ({ ...prev, name: false }));
                }} 
                placeholder="e.g. Blue Chillys Bottle" 
                style={{ 
                  borderColor: errors.name ? 'var(--coral)' : undefined
                }}
              />
              {errors.name && <span style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '4px' }}>This field is required.</span>}
            </label>
            <label style={{ fontSize: '15px', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Describe the item <span style={{ color: 'var(--coral)', fontSize: '18px', lineHeight: 1 }}>*</span></div>
              <textarea 
                value={description} 
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.desc) setErrors(prev => ({ ...prev, desc: false }));
                }} 
                placeholder="Colour, shape, a sticker, a scuff — anything that stands out..." 
                style={{ 
                  borderColor: errors.desc ? 'var(--coral)' : undefined
                }}
              />
              {errors.desc && <span style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '4px' }}>This field is required.</span>}
            </label>
            <div className="form-grid">
              <label style={{ fontSize: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>Where did you last see it? <span style={{ color: 'var(--coral)', fontSize: '18px', lineHeight: 1 }}>*</span></div>
                <input 
                  type="text" 
                  value={location} 
                  onChange={(e) => {
                    setSearchLocation(e.target.value);
                    if (errors.loc) setErrors(prev => ({ ...prev, loc: false }));
                  }} 
                  placeholder="e.g. Library, Cafe" 
                  style={{ 
                    borderColor: errors.loc ? 'var(--coral)' : undefined
                  }}
                />
                {errors.loc && <span style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '4px' }}>This field is required.</span>}
              </label>
              <label style={{ fontSize: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>When was it? <span style={{ color: 'var(--coral)', fontSize: '18px', lineHeight: 1 }}>*</span></div>
                <DatePicker 
                  selected={date} 
                  onChange={(d: Date | null) => {
                    setDate(d);
                    if (errors.date) setErrors(prev => ({ ...prev, date: false }));
                  }} 
                  showTimeInput
                  timeInputLabel="Time:"
                  dateFormat="dd/MM/yyyy, h:mm aa"
                  placeholderText="Select date and time"
                  ref={datePickerRef}
                  shouldCloseOnSelect={false}
                  customInput={
                    <input style={{ borderColor: errors.date ? 'var(--coral)' : undefined, width: '100%', cursor: 'pointer' }} readOnly />
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
                {errors.date && <span style={{ color: 'var(--coral)', fontSize: '12px', marginTop: '4px' }}>This field is required.</span>}
              </label>
            </div>
            <div className="form-footer" style={{ marginTop: '40px' }}>
              <span className={(!errors.name && !errors.desc && !errors.loc && !errors.date && itemName.trim() && description.trim() && location.trim() && date) ? "form-ready" : ""}>
                {(!errors.name && !errors.desc && !errors.loc && !errors.date && itemName.trim() && description.trim() && location.trim() && date) ? "Ready to look" : "Fill out all fields to begin"}
              </span>
              <Button onClick={handleSearch} variant="solid" icon={<ArrowRight size={17} />}>Find my item</Button>
            </div>
          </div>
        </section>
        <div className="quiet-note container-wide"><CircleHelp size={16} /><span>Not sure what to include? You can always add more detail after your first search.</span></div>
      </div>
    );
  }

  if (view === 'searching') {
    return (
      <div className="searching-page">
        <div className="searching-orbit">
          <div className="orbit-dot dot-one" />
          <div className="orbit-dot dot-two" />
          <div className="orbit-ring" />
          <Search size={34} />
        </div>
        <SectionLabel>Search in progress</SectionLabel>
        <h1>Looking through<br /><em>campus reports...</em></h1>
        <p>We’re checking photos, descriptions, places, and dates against what’s been reported nearby.</p>
        <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
        <div className="progress-meta"><span>{progress}% searched</span><span>Usually under 3 seconds</span></div>
        <button className="cancel-search" onClick={() => setView('find')}>Cancel and edit search</button>
      </div>
    );
  }

  // results
  const items = result?.results || [];
  
  return (
    <div className="page-shell results-page">
      <PageTop 
        eyebrow="Search results" 
        title={<>A few things<br /><em>look familiar.</em></>} 
        intro="We found these nearby reports based on your photo and details. Nothing here is a certainty — you’re the best judge." 
        action={<Button onClick={() => setView('find')} variant="outline" icon={<ArrowLeft size={16} />}>Edit search</Button>} 
      />
      <section className="results-controls container-wide">
        <div className="results-count"><span className="live-dot" />{items.length} possible matches near {location}</div>
        <div className="result-filters">
          <Filter size={15} />
          {["All", "Strong match", "Possible match"].map((f) => (
            <button key={f} className={filter === f ? "filter-active" : ""} onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </section>
      <section className="results-grid container-wide">
        {items.length > 0 ? (
          items.map((item, index) => (
            <ResultCard key={item.item_instance_id} item={item} primary={index === 0} onClick={() => router.push(`/item/${item.report_id || item.item_instance_id}`)} />
          ))
        ) : (
          <div className="empty-state">
            <span>NO MATCHES YET</span>
            <h2>We've got your back.</h2>
            <p>Your item hasn't been reported found yet. We're keeping an active lookout and will instantly notify you the second a match appears on campus.</p>
            <Button onClick={() => setView('find')} variant="outline">Edit search</Button>
          </div>
        )}
      </section>
      <div className="results-foot container-wide"><ShieldCheck size={17} /><span>Match language is a helpful signal, not a guarantee. Always check the details before making contact.</span></div>
    </div>
  );
}

export default function SearchFlowPage() {
  return (
    <Suspense fallback={<div className="page-shell">Loading...</div>}>
      <SearchFlowContent />
    </Suspense>
  );
}
