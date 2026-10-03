import Image from "next/image";

export default function Home() {
  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50"><div className="w-full bg-hot-magenta text-on-primary border-b border-retro-border"><div className="max-w-7xl mx-auto px-6 h-9 flex items-center justify-between font-label-code text-label-code"><div className="flex items-center gap-space-sm"><span className="inline-block px-1.5 py-0.5 bg-retro-charcoal text-white font-label-caps text-label-caps uppercase border border-retro-border">SYS:REV-24</span><span>Introducing Griffin: 48% thought it was a real person, the first model to pass the real-time video Turing test.</span></div><a className="flex items-center gap-1 font-bold underline underline-offset-4 decoration-retro-charcoal hover:text-pastel-yellow transition-colors" data-path="research" href="#">Learn more -&gt;</a></div></div><div className="w-full bg-surface-canvas/95 backdrop-blur-md border-b border-retro-border"><div className="h-16 max-w-7xl mx-auto px-6 flex items-center justify-between gap-space-lg"><div className="flex items-center gap-space-lg"><a className="flex items-center gap-2.5 group" data-path="overview" href="#"><div className="w-7 h-7 bg-retro-charcoal flex items-center justify-center border border-retro-border rotate-45 group-hover:bg-hot-magenta transition-colors"><div className="w-2.5 h-2.5 bg-surface-canvas -rotate-45"></div></div><div className="flex flex-col"><span className="font-headline-sm text-headline-sm tracking-tight text-retro-charcoal font-bold leading-none">BACK²U</span><span className="font-label-bracket text-label-bracket text-outline uppercase tracking-wider">UNIVERSITY LOST & FOUND</span></div></a><nav className="hidden xl:flex items-center gap-6 font-body-sm text-body-sm" data-active-classes="text-primary font-bold border-b-2 border-primary"><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="products" href="#">Products</a><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="enterprise" href="#">Enterprise</a><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="use-cases" href="#">By Use Case</a><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="api-platform" href="#">API Platform</a><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="research" href="#">Research</a><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="vision" href="#">Vision</a><a className="text-on-surface-variant hover:text-on-surface transition-colors py-1" data-path="pricing" href="#">Pricing</a></nav></div><div className="flex items-center gap-space-md"><a className="hidden sm:inline-block font-label-caps text-label-caps uppercase text-on-surface-variant hover:text-on-surface tracking-wider px-3 py-1.5 transition-colors" data-path="login" href="#">Login</a><a className="px-4 py-2 bg-hot-pink text-on-primary font-label-caps text-label-caps uppercase tracking-wider border border-retro-border shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-1.5" data-path="pricing" href="#"><span>Get Started</span><span className="material-symbols-outlined text-sm">arrow_forward</span></a><img alt="Profile" className="w-8 h-8 rounded-full object-cover border border-retro-border ml-1" src="https://lh3.googleusercontent.com/aida/AEtjO1Wrl_DTtqJ02vHL12-wVbjmOkLmxwSkah1nviqHaNGCna4sEqkSlM_WFC-4FQxS59mGMKvKWpoOPSLNrQY-6pJRR8yGMQ9Hb9c-H_rh3exf6VZqmTTnsBVo-8fgANKOQWxFmp5aNzNMP4RSC6R-uxWhuW8x3r4DFkqu2LMz213dmKhHv1-NOd_WpsieBHayFJFOSkmMrIOKATRDLFDgRbd0AzkMj_ocIhpL93-cUcHgwfHTOk1iokj4FLkg"/></div></div></div></header><main className="w-full pt-[100px] bg-surface min-h-[calc(100vh-100px)]"><div className="flex flex-col w-full">
{/*  SECTION 1: DESKTOP HERO SECTION  */}
<section className="w-full border-b-2 border-retro-border bg-surface-canvas relative overflow-hidden">
{/*  Subtle retro dot-matrix background simulation  */}
<div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#1A1A1A_1px,transparent_1px)] [background-size:16px_16px]"></div>
<div className="max-w-7xl mx-auto px-6 pt-12 pb-16 relative">
<div className="flex flex-col items-center text-center max-w-4xl mx-auto">
{/*  Pill tag  */}
<div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-sand border border-retro-border shadow-[2px_2px_0px_#1A1A1A] mb-6">
<span className="w-2 h-2 rounded-full bg-hot-pink animate-pulse"></span>
<span className="font-label-caps text-label-caps tracking-wider text-retro-charcoal">INTRODUCING GRIFFIN</span>
<span className="text-outline text-xs">/</span>
<span className="font-label-code text-[11px] text-primary font-bold">STATE_OF_THE_ART</span>
</div>
{/*  Headline  */}
<h1 className="font-display-hero text-display-hero md:text-[62px] md:leading-[66px] text-retro-charcoal tracking-tight max-w-3xl mb-4 font-headline-lg">
          Introducing Griffin, the first AI to pass the <span className="italic font-display-hero font-normal text-primary">Video Turing test</span>
</h1>
{/*  Subtitle  */}
<p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mb-8 leading-relaxed">
          A monumental leap towards machines that perceive, respond, and connect with unmistakable humanity.
        </p>
{/*  CTAs  */}
<div className="flex flex-wrap items-center justify-center gap-4 mb-12">
<a className="px-6 py-3 bg-hot-pink text-on-primary font-label-caps text-label-caps uppercase tracking-wider border-2 border-retro-border shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#1A1A1A] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center gap-2" href="#">
<span>SEE IT FOR YOURSELF</span>
<span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
</a>
<a className="px-5 py-3 bg-surface-canvas hover:bg-pastel-yellow text-retro-charcoal font-label-code text-label-code border border-retro-border shadow-[2px_2px_0px_#1A1A1A] transition-all flex items-center gap-1.5" href="#">
<span>Read technical whitepaper</span>
<span className="font-bold">→</span>
</a>
</div>
</div>
{/*  Main Visual Showcase: Retro OS Window Container  */}
<div className="max-w-4xl mx-auto border-2 border-retro-border bg-retro-charcoal shadow-[6px_6px_0px_#1A1A1A]">
{/*  Title bar  */}
<div className="bg-window-bar-gray px-4 py-2 border-b-2 border-retro-border flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded-full bg-hot-pink border border-retro-border cursor-pointer"></div>
<div className="w-3 h-3 rounded-full bg-pastel-yellow-gold border border-retro-border cursor-pointer"></div>
<div className="w-3 h-3 rounded-full bg-pastel-mint border border-retro-border cursor-pointer"></div>
<span className="ml-3 font-label-code text-label-code text-retro-charcoal font-bold tracking-tight">GRIFFIN_CAM_FEED_V5.0.EXE</span>
</div>
<div className="flex items-center gap-3">
<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-hot-magenta text-white font-label-code text-[10px] border border-retro-border">
<span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
              [LIVE 60FPS]
            </span>
<span className="font-label-code text-label-code text-on-surface-variant hidden sm:inline">REC: 00:48:19:02</span>
</div>
</div>
{/*  Window Viewport  */}
<div className="relative bg-surface-sand p-2 sm:p-4">
<div className="relative overflow-hidden border border-retro-border aspect-[16/10] bg-pastel-sky/30">
<img alt="Griffin Neural Representation looking up to floating OS monitors" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AEtjO1Wrl_DTtqJ02vHL12-wVbjmOkLmxwSkah1nviqHaNGCna4sEqkSlM_WFC-4FQxS59mGMKvKWpoOPSLNrQY-6pJRR8yGMQ9Hb9c-H_rh3exf6VZqmTTnsBVo-8fgANKOQWxFmp5aNzNMP4RSC6R-uxWhuW8x3r4DFkqu2LMz213dmKhHv1-NOd_WpsieBHayFJFOSkmMrIOKATRDLFDgRbd0AzkMj_ocIhpL93-cUcHgwfHTOk1iokj4FLkg"/>
{/*  Scanline layer overlay  */}
<div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.18)_50%)] bg-[length:100%_4px] mix-blend-overlay opacity-60"></div>
{/*  Overlay Badge at bottom-left  */}
<div className="absolute bottom-4 left-4 p-3 bg-surface-canvas/95 backdrop-blur border-2 border-retro-border shadow-[3px_3px_0px_#1A1A1A]">
<div className="flex items-center gap-2 mb-1">
<span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
<span className="font-label-code text-[11px] font-bold text-retro-charcoal uppercase">Empirical Benchmark Result</span>
</div>
<div className="font-display-hero text-headline-lg font-headline-lg text-primary font-bold leading-none">
                48% <span className="text-body-md font-body-md text-on-surface font-normal">Turing Acceptance Rate</span>
</div>
<div className="font-label-code text-[10px] text-on-surface-variant mt-1 border-t border-retro-border pt-1">
                SAMPLE: N=2,400 RANDOMIZED BLIND CONVERSATIONS
              </div>
</div>
{/*  Overlay Diagnostics HUD top-right  */}
<div className="absolute top-4 right-4 hidden md:flex flex-col gap-1 items-end pointer-events-none">
<div className="px-2 py-1 bg-retro-charcoal/80 text-pastel-mint font-label-code text-[10px] border border-retro-border">
                LATENCY: 112ms (STREAMING)
              </div>
<div className="px-2 py-1 bg-retro-charcoal/80 text-white font-label-code text-[10px] border border-retro-border">
                SYNC_ERROR: &lt; 0.003s
              </div>
<div className="px-2 py-1 bg-retro-charcoal/80 text-pastel-peach font-label-code text-[10px] border border-retro-border">
                MULTIMODAL_AUDIO_VIDEO: PASS
              </div>
</div>
</div>
</div>
{/*  Window Status Footer  */}
<div className="bg-window-bar-gray/80 px-4 py-1.5 border-t border-retro-border flex items-center justify-between font-label-code text-[11px] text-on-surface-variant">
<div className="flex items-center gap-4">
<span>MODEL_ID: GRIFFIN_SYNTH_PROD_1</span>
<span className="hidden sm:inline">CUDA_CORES: 16,384</span>
</div>
<div>READY TO COMMENCE CONVERSATION</div>
</div>
</div>
{/*  Social Proof Bar  */}
<div className="mt-14 pt-8 border-t border-retro-border/60 flex flex-col items-center">
<span className="font-label-caps text-label-caps tracking-widest text-on-surface-variant uppercase mb-6">
          Powering 150,000+ developers and the world's most forward-thinking companies
        </span>
<div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 font-headline-sm text-headline-sm text-retro-charcoal/70 font-semibold tracking-tighter">
<span className="hover:text-retro-charcoal cursor-default transition-colors">salesforce</span>
<span className="hover:text-retro-charcoal cursor-default transition-colors">amazon</span>
<span className="hover:text-retro-charcoal cursor-default transition-colors">Healthline</span>
<span className="hover:text-retro-charcoal cursor-default transition-colors">orum</span>
<span className="hover:text-retro-charcoal cursor-default transition-colors">REGENERON</span>
</div>
</div>
</div>
</section>
{/*  SECTION 2: VISION MANIFEST  */}
<section className="w-full border-b-2 border-retro-border bg-surface py-16">
<div className="max-w-7xl mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
{/*  Left: Large Editorial Title  */}
<div className="lg:col-span-5 space-y-4">
<div className="font-label-code text-label-code text-primary uppercase font-bold tracking-widest">[ 01 // COMPUTING_REVOLUTION ]</div>
<h2 className="font-display-hero text-display-hero font-headline-lg text-retro-charcoal leading-[1.1]">
            Imagine a future with a <span className="italic font-display-hero text-primary">personal assistant</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant">
            back²u, the university lost & found platform
          </p>
</div>
{/*  Right: Vision Manifest Window Box  */}
<div className="lg:col-span-7 bg-surface-canvas border-2 border-retro-border shadow-[5px_5px_0px_#1A1A1A]">
<div className="bg-window-bar-gray px-4 py-2 border-b border-retro-border flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-2.5 h-2.5 rounded-full bg-retro-charcoal"></div>
<span className="font-label-code text-label-code text-retro-charcoal font-bold">VISION.MANIFEST</span>
</div>
<span className="font-label-bracket text-label-bracket text-outline">[ READ_ONLY ]</span>
</div>
<div className="p-8 space-y-5 bg-surface-sand/40">
<div className="inline-block px-2 py-0.5 bg-pastel-yellow border border-retro-border font-label-caps text-label-caps uppercase text-retro-charcoal">
              Pioneering human computing since 2020
            </div>
<p className="font-headline-md text-headline-md text-retro-charcoal font-headline-md leading-snug">
              BACK²U is an AI research lab pioneering human computing: a future where using a computer feels unmistakably human.
            </p>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              We build foundational models that teach machines to see, hear, understand, and respond in real time. We refuse to settle for lifeless dialogue and robotic synthetics.
            </p>
<div className="pt-4 flex flex-wrap gap-4 border-t border-retro-border">
<a className="px-5 py-2.5 bg-hot-pink text-white font-label-caps text-label-caps uppercase border border-retro-border shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] transition-all" href="#">
                See Research
              </a>
<a className="px-5 py-2.5 bg-surface-canvas hover:bg-surface-warm-grey text-retro-charcoal font-label-caps text-label-caps uppercase border border-retro-border shadow-[2px_2px_0px_#1A1A1A] transition-all" href="#">
                Learn about our mission
              </a>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  SECTION 3: ANATOMY OF A PAL  */}
<section className="w-full border-b-2 border-retro-border bg-surface-sand py-20">
<div className="max-w-7xl mx-auto px-6">
{/*  Section Header  */}
<div className="mb-12 max-w-3xl">
<div className="flex items-center gap-2 mb-2 font-label-code text-label-code text-primary font-bold">
<span>[ ARCHITECTURE_TEARDOWN ]</span>
<span>●</span>
<span>ANATOMY OF PALS</span>
</div>
<h2 className="font-display-hero text-headline-lg md:text-[48px] md:leading-[52px] font-headline-lg text-retro-charcoal mb-3">
          Anatomy of a PAL
        </h2>
<p className="font-body-lg text-body-lg text-on-surface-variant">
          More than just a face and a voice. A PAL is a whole person: an AI that pays attention, responds in real time, and works alongside you like a real partner.
        </p>
</div>
{/*  Desktop Interactive Teardown Grid  */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
{/*  Center/Left: Charlie Window  */}
<div className="lg:col-span-5 bg-surface-canvas border-2 border-retro-border shadow-[5px_5px_0px_#1A1A1A] sticky top-28">
<div className="bg-window-bar-gray px-4 py-2 border-b-2 border-retro-border flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded-full bg-hot-pink border border-retro-border"></div>
<div className="w-3 h-3 rounded-full bg-pastel-yellow-gold border border-retro-border"></div>
<div className="w-3 h-3 rounded-full bg-pastel-mint border border-retro-border"></div>
<span className="ml-2 font-label-code text-label-code font-bold text-retro-charcoal">PAL_SYS_CORE.EXE [v1.5]</span>
</div>
<span className="px-1.5 py-0.5 bg-pastel-mint border border-retro-border font-label-bracket text-label-bracket uppercase font-bold text-retro-charcoal">ACTIVE</span>
</div>
<div className="p-4 bg-surface-warm-grey/50">
<div className="relative border-2 border-retro-border overflow-hidden aspect-square bg-surface-sand">
<img alt="Charlie, Head of Customer Experience at BACK²U" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AEtjO1UVqu01casfJM4-74IJR7aw2W-zrzvwwYHynCzgqtkbrRFnhGHppasP3TwrgeU0u3BuhEOFfQ-5UYkkg7OEYlgCOenTWpsrPoi26KG1cRk1Wcap_gxZ3cF-2SW_DimUe33FcC3Z8gHAOe_CVfXvxiPw8mnGI-eqAVufhAcDlo_v1v-pvrV1JXymQcYRdMW_CIfaHq2Ck3lxEawcvCWaiPYY-c8BuzDOyHmWtb0UG5ErF5RNlZAP9Deh8R88"/>
{/*  Floating HUD Tags  */}
<div className="absolute top-3 left-3 bg-retro-charcoal/90 text-white px-2.5 py-1 font-label-code text-[11px] border border-retro-border">
                PAL: CHARLIE
              </div>
<div className="absolute bottom-3 right-3 bg-surface-canvas/95 px-2.5 py-1 font-label-code text-[11px] text-retro-charcoal border border-retro-border shadow-[1px_1px_0px_#1A1A1A]">
                MICRO-LATENCY: 134ms
              </div>
</div>
<div className="mt-4 p-3 bg-surface-canvas border border-retro-border">
<div className="flex items-center justify-between">
<div>
<div className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">Charlie</div>
<div className="font-label-code text-label-code text-on-surface-variant">Head of Customer Experience</div>
</div>
<button className="px-3 py-1.5 bg-hot-pink text-white font-label-caps text-label-caps uppercase border border-retro-border shadow-[1px_1px_0px_#1A1A1A] hover:bg-primary transition-colors">
                  Speak Live
                </button>
</div>
</div>
</div>
</div>
{/*  Right: Modular Pastel Cards  */}
<div className="lg:col-span-7 flex flex-col gap-4">
{/*  01. VOICE  */}
<div className="bg-pastel-lavender border-2 border-retro-border p-5 shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-1 transition-transform">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="font-label-code text-label-code font-bold px-1.5 py-0.5 bg-surface-canvas border border-retro-border">01. AUDIO ENGINE</span>
<span className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">Voice</span>
</div>
<span className="font-label-code text-label-code px-2 py-0.5 bg-white border border-retro-border text-primary font-bold">[134ms latency]</span>
</div>
<p className="font-body-md text-body-md text-retro-charcoal leading-relaxed">
              Speaks naturally in real time, with the rhythm, warmth, and inflection of a real human. Delivers laughter, spontaneous pauses, and adaptive cadence that mirrors true emotional connection.
            </p>
</div>
{/*  02. PERSONALITY & MEMORY  */}
<div className="bg-pastel-peach border-2 border-retro-border p-5 shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-1 transition-transform">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="font-label-code text-label-code font-bold px-1.5 py-0.5 bg-surface-canvas border border-retro-border">02. COGNITIVE RECALL</span>
<span className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">Personality and Memory</span>
</div>
<span className="font-label-code text-label-code px-2 py-0.5 bg-white border border-retro-border text-tertiary font-bold">[Infinite Recall]</span>
</div>
<p className="font-body-md text-body-md text-retro-charcoal leading-relaxed">
              Takes on the role, personality, and rules you give it. Remembers every conversation and picks up right where you left off across days, meetings, or customer support touchpoints.
            </p>
</div>
{/*  03. FACE & PRESENCE  */}
<div className="bg-pastel-yellow border-2 border-retro-border p-5 shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-1 transition-transform">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="font-label-code text-label-code font-bold px-1.5 py-0.5 bg-surface-canvas border border-retro-border">03. SYNTHETIC VIDEO</span>
<span className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">Face &amp; Expression</span>
</div>
<span className="font-label-code text-label-code px-2 py-0.5 bg-white border border-retro-border text-retro-charcoal font-bold">[Photorealistic 4K]</span>
</div>
<p className="font-body-md text-body-md text-retro-charcoal leading-relaxed">
              Expresses emotion and moves naturally, reacting in real time just like a person would. Sustains accurate gaze tracking, micro-eyebrow shifts, head tilts, and spontaneous non-verbal cues.
            </p>
</div>
{/*  04. SKILLS & CAPABILITIES  */}
<div className="bg-pastel-mint border-2 border-retro-border p-5 shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-1 transition-transform">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="font-label-code text-label-code font-bold px-1.5 py-0.5 bg-surface-canvas border border-retro-border">04. RUNTIME EXECUTION</span>
<span className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">Skills and Capabilities</span>
</div>
<span className="font-label-code text-label-code px-2 py-0.5 bg-white border border-retro-border text-primary font-bold">[Tool Execution]</span>
</div>
<p className="font-body-md text-body-md text-retro-charcoal leading-relaxed">
              Presents decks, creates visuals on the fly, shares its screen, and joins your Zoom or Google Meet calls, all out of the box with dynamic tool calling capabilities.
            </p>
</div>
{/*  05. EYES & EARS  */}
<div className="bg-pastel-sky border-2 border-retro-border p-5 shadow-[3px_3px_0px_#1A1A1A] hover:translate-x-1 transition-transform">
<div className="flex items-center justify-between mb-2">
<div className="flex items-center gap-2">
<span className="font-label-code text-label-code font-bold px-1.5 py-0.5 bg-surface-canvas border border-retro-border">05. MULTIMODAL PERCEPTION</span>
<span className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">Eyes &amp; Ears</span>
</div>
<span className="font-label-code text-label-code px-2 py-0.5 bg-white border border-retro-border text-retro-charcoal font-bold">[Multimodal Stream]</span>
</div>
<p className="font-body-md text-body-md text-retro-charcoal leading-relaxed">
              Reads your expressions, your focus, and the world around you. Hears tone, hesitation, and the exact difference between a contemplative pause and a finished thought.
            </p>
</div>
</div>
</div>
</div>
</section>
{/*  SECTION 4: CAPABILITIES GRID (AI THAT CAN WORK LIKE HUMANS DO)  */}
<section className="w-full border-b-2 border-retro-border bg-surface-canvas py-20">
<div className="max-w-7xl mx-auto px-6">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-retro-border pb-6">
<div>
<div className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-widest mb-1">
            [ RUNTIME MATRIX // CAPABILITIES ]
          </div>
<h2 className="font-display-hero text-headline-lg md:text-[44px] font-headline-lg text-retro-charcoal">
            AI that can work like humans do
          </h2>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-md mt-4 md:mt-0">
          Everything your PAL needs to present, browse, meet, and create interactive experiences in real time.
        </p>
</div>
{/*  Bento Grid (3-column layout)  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{/*  Card 1: PRESENTATION MODE  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">PRESENTATION MODE</span>
<span className="text-outline">MOD:01</span>
</div>
<div className="p-6">
<div className="w-10 h-10 bg-pastel-lavender border border-retro-border flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-retro-charcoal">slideshow</span>
</div>
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Your slides, presented live
              </h3>
<p className="font-body-md text-body-md text-on-surface-variant">
                PALs can present a slide deck and talk through it on their own, so the best presentation is delivered every time. Adapts dynamically to live interruptions.
              </p>
</div>
</div>
<div className="px-6 py-2.5 bg-surface-sand/80 border-t border-retro-border font-label-bracket text-label-bracket text-on-surface-variant">
            CAPABILITY: SLIDE_SYNTH_ACTIVE
          </div>
</div>
{/*  Card 2: MAGIC CANVAS  */}
<div className="bg-pastel-mint/30 border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">MAGIC CANVAS</span>
<span className="text-outline">MOD:02</span>
</div>
<div className="p-6">
<div className="w-10 h-10 bg-pastel-mint border border-retro-border flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-retro-charcoal">draw</span>
</div>
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Show content, multiple choice questions <span className="italic font-normal">and more</span> on the fly
              </h3>
<p className="font-body-md text-body-md text-on-surface-variant">
                With Magic Canvas, PALs can generate UI on the fly. Charts, questionnaires, and scheduling pages can all be generated in real time and shown on screen.
              </p>
</div>
</div>
<div className="px-6 py-2.5 bg-surface-sand/80 border-t border-retro-border font-label-bracket text-label-bracket text-on-surface-variant">
            CAPABILITY: REALTIME_UI_INJECTION
          </div>
</div>
{/*  Card 3: VIDEO CALLS  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">VIDEO CALLS</span>
<span className="text-outline">MOD:03</span>
</div>
<div className="p-6">
<div className="w-10 h-10 bg-pastel-sky border border-retro-border flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-retro-charcoal">video_camera_front</span>
</div>
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Join your Meets, Zoom, or Teams calls
              </h3>
<p className="font-body-md text-body-md text-on-surface-variant">
                PALs can join a video conference as a full participant, on camera, seeing and hearing the room, and taking its turn in real time with high poise.
              </p>
</div>
</div>
<div className="px-6 py-2.5 bg-surface-sand/80 border-t border-retro-border font-label-bracket text-label-bracket text-on-surface-variant">
            CAPABILITY: SIP / WEBRTC / ZOOM SDK
          </div>
</div>
{/*  Card 4: BROWSER USE  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">BROWSER USE</span>
<span className="text-outline">MOD:04</span>
</div>
<div className="p-6">
<div className="w-10 h-10 bg-pastel-peach border border-retro-border flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-retro-charcoal">globe</span>
</div>
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Browse websites, just like you do
              </h3>
<p className="font-body-md text-body-md text-on-surface-variant">
                PALs open your product in a browser, share their screen, click through it, and guide users through it live while narrating actions step-by-step.
              </p>
</div>
</div>
<div className="px-6 py-2.5 bg-surface-sand/80 border-t border-retro-border font-label-bracket text-label-bracket text-on-surface-variant">
            CAPABILITY: HEADLESS_AGENT_NAVIGATION
          </div>
</div>
{/*  Card 5: MEMORY & REASONING  */}
<div className="bg-pastel-yellow/30 border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">MEMORY &amp; KNOWLEDGE</span>
<span className="text-outline">MOD:05</span>
</div>
<div className="p-6">
<div className="w-10 h-10 bg-pastel-yellow border border-retro-border flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-retro-charcoal">psychology</span>
</div>
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                A savant with photographic memory
              </h3>
<p className="font-body-md text-body-md text-on-surface-variant">
                Upload your documents and context and your PAL answers straight from them, grounded in facts. Your PAL remembers you between calls.
              </p>
</div>
</div>
<div className="px-6 py-2.5 bg-surface-sand/80 border-t border-retro-border font-label-bracket text-label-bracket text-on-surface-variant">
            CAPABILITY: VECTOR_RAG_LONG_HORIZON
          </div>
</div>
{/*  Card 6: BUILT IN LLMS  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">BUILT IN LLMS</span>
<span className="text-outline">MOD:06</span>
</div>
<div className="p-6">
<div className="w-10 h-10 bg-pastel-lavender border border-retro-border flex items-center justify-center mb-4">
<span className="material-symbols-outlined text-retro-charcoal">bolt</span>
</div>
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Fastest LLMs, <span className="italic font-normal">or bring your own</span>
</h3>
<p className="font-body-md text-body-md text-on-surface-variant">
                Choose from a range of fast, hosted models, or bring your own so replies feel instant. Unrivaled turn-taking orchestration without awkward latency.
              </p>
</div>
</div>
<div className="px-6 py-2.5 bg-surface-sand/80 border-t border-retro-border font-label-bracket text-label-bracket text-on-surface-variant">
            CAPABILITY: ZERO_LATENCY_PIPE
          </div>
</div>
</div>
</div>
</section>
{/*  SECTION 5: REAL WORLD IMPACT / BESPOKE PALS CASE STUDIES  */}
<section className="w-full border-b-2 border-retro-border bg-surface py-20">
<div className="max-w-7xl mx-auto px-6">
{/*  Section Header  */}
<div className="mb-10">
<span className="font-label-code text-label-code text-primary uppercase font-bold tracking-widest">[ DEPLOYMENT_PROOFS ]</span>
<h2 className="font-display-hero text-headline-lg md:text-[46px] font-headline-lg text-retro-charcoal mt-1">
          Bespoke PALs for every use case, <span className="italic text-primary font-normal">not one-size-fits-all chatbots</span>
</h2>
<p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-2">
          Customers big and small are building PAL employees, sidekicks and assistants that represent their brand and build trust and connection with users.
        </p>
</div>
{/*  Tab Bar (Retro 90s tabs)  */}
<div className="flex items-center gap-1 border-b-2 border-retro-border mb-8 overflow-x-auto">
<button className="px-5 py-2.5 bg-surface-sand border-t-2 border-x-2 border-retro-border -mb-[2px] font-label-code text-label-code font-bold text-retro-charcoal flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-hot-pink"></span>
<span>Sales &amp; GTM</span>
</button>
<button className="px-5 py-2.5 bg-surface-canvas/60 hover:bg-surface-sand border-t-2 border-x-2 border-transparent hover:border-retro-border font-label-code text-label-code text-on-surface-variant transition-colors">
          L&amp;D
        </button>
<button className="px-5 py-2.5 bg-surface-canvas/60 hover:bg-surface-sand border-t-2 border-x-2 border-transparent hover:border-retro-border font-label-code text-label-code text-on-surface-variant transition-colors">
          Healthcare
        </button>
<button className="px-5 py-2.5 bg-surface-canvas/60 hover:bg-surface-sand border-t-2 border-x-2 border-transparent hover:border-retro-border font-label-code text-label-code text-on-surface-variant transition-colors">
          Dream your own
        </button>
</div>
{/*  Featured Case Study Window (Salesforce)  */}
<div className="bg-surface-canvas border-2 border-retro-border shadow-[6px_6px_0px_#1A1A1A] mb-8">
<div className="bg-window-bar-gray px-4 py-2 border-b-2 border-retro-border flex items-center justify-between">
<div className="flex items-center gap-2">
<div className="w-3 h-3 rounded-full bg-hot-pink border border-retro-border"></div>
<div className="w-3 h-3 rounded-full bg-pastel-yellow-gold border border-retro-border"></div>
<div className="w-3 h-3 rounded-full bg-pastel-mint border border-retro-border"></div>
<span className="ml-2 font-label-code text-label-code font-bold text-retro-charcoal">SALESFORCE • ENTERPRISE CASE STUDY [VERIFIED]</span>
</div>
<span className="font-label-code text-[11px] text-primary font-bold">CLIENT_ID: CRM_SFDC_NA</span>
</div>
<div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
{/*  Left: Piper Visual & Overview  */}
<div className="lg:col-span-6 space-y-4">
<div className="flex items-center gap-4">
<div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-retro-border overflow-hidden bg-surface-warm-grey shrink-0 shadow-[3px_3px_0px_#1A1A1A]">
<img alt="Piper the PAL SDR avatar portrait" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AEtjO1UoZUwrxTd9H_myM7HcWn2wlLMrothIIQRSK5jaCxT45NXStTNQQ4VDHMtVuaPdqs9-lB6B7hD4E369Ddaue5SeAqluWh8CncSfWoGEpjLagkTQVYZwd9iwBa6REr4tBgkw62ebegHJulhUun7t5Ho_H8h0XYEIHiAy3DHzdYRP0n0V9gprcwfxslFZMQkQS0qy-Zoz5X7W6KkJ0OCEfTzcyJH9ySNlitYficjwZPUTwuj6MkxDvjyGmKBx"/>
</div>
<div>
<span className="px-2 py-0.5 bg-pastel-sky border border-retro-border font-label-caps text-label-caps uppercase text-retro-charcoal">
                  Salesforce
                </span>
<h3 className="font-headline-lg text-headline-md md:text-headline-lg font-headline-lg text-retro-charcoal mt-1">
                  Meet Piper, the PAL SDR
                </h3>
<span className="font-label-code text-label-code text-on-surface-variant block">Autonomous Pipeline Accelerator</span>
</div>
</div>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Salesforce built Piper, a real-time AI sales development rep, on BACK²U. She works Salesforce's main touchpoints and talks with tens of thousands of visitors a day, answering questions, keeping them engaged, and turning more of them into pipeline.
            </p>
</div>
{/*  Right: Key Metric Blocks  */}
<div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
{/*  Result 1  */}
<div className="bg-pastel-lavender/60 border-2 border-retro-border p-4 shadow-[2px_2px_0px_#1A1A1A] flex flex-col justify-between">
<span className="font-label-code text-[10px] uppercase text-retro-charcoal font-bold">Result [1]</span>
<div className="my-3">
<span className="font-display-hero text-headline-lg font-bold text-retro-charcoal">6x</span>
</div>
<span className="font-label-code text-[11px] text-on-surface-variant leading-tight">
                increase in meetings scheduled
              </span>
</div>
{/*  Result 2  */}
<div className="bg-pastel-mint/60 border-2 border-retro-border p-4 shadow-[2px_2px_0px_#1A1A1A] flex flex-col justify-between">
<span className="font-label-code text-[10px] uppercase text-retro-charcoal font-bold">Result [2]</span>
<div className="my-3">
<span className="font-display-hero text-headline-lg font-bold text-retro-charcoal">2x</span>
</div>
<span className="font-label-code text-[11px] text-on-surface-variant leading-tight">
                increase in conversation engagement
              </span>
</div>
{/*  Result 3  */}
<div className="bg-pastel-peach/60 border-2 border-retro-border p-4 shadow-[2px_2px_0px_#1A1A1A] flex flex-col justify-between">
<span className="font-label-code text-[10px] uppercase text-retro-charcoal font-bold">Result [3]</span>
<div className="my-3">
<span className="font-display-hero text-headline-lg font-bold text-retro-charcoal">#1</span>
</div>
<span className="font-label-code text-[11px] text-on-surface-variant leading-tight">
                AI SDR agent on G2
              </span>
</div>
</div>
</div>
</div>
{/*  Side Companion Case Cards  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/*  Orum  */}
<div className="bg-surface-sand border-2 border-retro-border p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-3">
<span className="font-label-caps text-label-caps uppercase px-2 py-0.5 bg-surface-canvas border border-retro-border text-retro-charcoal font-bold">Orum</span>
<span className="font-label-bracket text-label-bracket text-on-surface-variant">[ SALES ROLE-PLAY ]</span>
</div>
<h4 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
              Meet Aurora, the PAL Coach
            </h4>
<p className="font-body-md text-body-md text-on-surface-variant mb-4">
              Orum built Aurora on BACK²U to run AI sales role-play, live for every user. Reps get lifelike practice calls whenever they want.
            </p>
<div className="p-3 bg-surface-canvas border border-retro-border italic font-headline-md text-sm text-retro-charcoal mb-4">
              “By having that visual and emotional connection, it creates a more high stakes conversation… and makes practice more effective.”
              <span className="block mt-1 font-label-code text-[10px] not-italic text-on-surface-variant font-bold">— Bob Aspell, VP of Product, Orum</span>
</div>
</div>
<div className="grid grid-cols-3 gap-2 pt-3 border-t border-retro-border text-center">
<div>
<div className="font-label-code text-headline-sm font-bold text-primary">50%</div>
<div className="font-label-bracket text-[10px] text-on-surface-variant">Ramp Reduction</div>
</div>
<div>
<div className="font-label-code text-headline-sm font-bold text-primary">3x</div>
<div className="font-label-bracket text-[10px] text-on-surface-variant">Rep Conversion</div>
</div>
<div>
<div className="font-label-code text-headline-sm font-bold text-primary">25%</div>
<div className="font-label-bracket text-[10px] text-on-surface-variant">Coaching Rev</div>
</div>
</div>
</div>
{/*  Regeneron  */}
<div className="bg-surface-sand border-2 border-retro-border p-6 shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between">
<div>
<div className="flex items-center justify-between mb-3">
<span className="font-label-caps text-label-caps uppercase px-2 py-0.5 bg-surface-canvas border border-retro-border text-retro-charcoal font-bold">MLG / Regeneron</span>
<span className="font-label-bracket text-label-bracket text-on-surface-variant">[ CLINICAL EDUCATION ]</span>
</div>
<h4 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
              Meet Ruby, the PAL CME Consultant
            </h4>
<p className="font-body-md text-body-md text-on-surface-variant mb-4">
              Med Learning Group built Ruby, the world's first AI clinical consultant for cSCC. Thousands of clinicians use her for continuing education with vetted clinical accuracy.
            </p>
</div>
<div className="grid grid-cols-3 gap-2 pt-3 border-t border-retro-border text-center">
<div>
<div className="font-label-code text-headline-sm font-bold text-retro-charcoal">1st</div>
<div className="font-label-bracket text-[10px] text-on-surface-variant">cSCC AI Consultant</div>
</div>
<div>
<div className="font-label-code text-headline-sm font-bold text-retro-charcoal">65%</div>
<div className="font-label-bracket text-[10px] text-on-surface-variant">Knowledge Gain</div>
</div>
<div>
<div className="font-label-code text-headline-sm font-bold text-retro-charcoal">AMA</div>
<div className="font-label-bracket text-[10px] text-on-surface-variant">ACCME Accredited</div>
</div>
</div>
</div>
</div>
</div>
</section>
{/*  SECTION 6: FOUNDATIONAL MODELS SUITE  */}
<section className="w-full border-b-2 border-retro-border bg-surface-sand py-20">
<div className="max-w-7xl mx-auto px-6">
<div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-retro-border pb-6">
<div>
<span className="font-label-code text-label-code text-primary uppercase font-bold tracking-widest">[ BENCHMARK_CORE // RESEARCH ]</span>
<h2 className="font-display-hero text-headline-lg md:text-[44px] font-headline-lg text-retro-charcoal mt-1">
            Four models, working in sync.
          </h2>
<p className="font-headline-md text-headline-md italic font-headline-md text-primary">
            One seamless conversation.
          </p>
</div>
<p className="font-body-md text-body-md text-on-surface-variant max-w-sm mt-4 md:mt-0">
          BACK²U unifies turn-taking, rendering, perception, and speech in real time, so every interaction feels immediate, aware, and natural.
        </p>
</div>
{/*  4 Model Cards Grid (2x2 or 4-column)  */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
{/*  Model 1: SPARROW [2]  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">TURN-TAKING</span>
<span className="px-1 bg-pastel-mint border border-retro-border">#1 TurnBench</span>
</div>
<div className="p-5">
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Sparrow [2]
              </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                Sparrow is the #1 conversational understanding model on the market, built to understand when to listen, wait, speak, and respond.
              </p>
<div className="space-y-2 pt-2 border-t border-retro-border/60 font-label-code text-[11px]">
<div className="flex items-center gap-1.5 text-retro-charcoal">
<span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
<span className="font-bold">Lowest conversational error rate</span>
</div>
<div className="flex items-center gap-1.5 text-on-surface-variant">
<span className="w-1.5 h-1.5 bg-retro-charcoal rounded-full"></span>
<span>Audio scene pause comprehension</span>
</div>
</div>
</div>
</div>
<div className="px-5 py-2.5 bg-surface-canvas border-t border-retro-border font-label-bracket text-label-bracket text-outline">
            SYS: SUB-500MS TURN RESPONSE
          </div>
</div>
{/*  Model 2: PHOENIX [4.5]  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">RENDERING</span>
<span className="px-1 bg-pastel-yellow border border-retro-border">Photorealistic</span>
</div>
<div className="p-5">
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Phoenix [4.5]
              </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                The most natural human rendering model on the market. Renders lifelike faces, expressions, and upper-body movements zero-shot from a single image.
              </p>
<div className="space-y-2 pt-2 border-t border-retro-border/60 font-label-code text-[11px]">
<div className="flex items-center gap-1.5 text-primary font-bold">
<span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
<span>134ms latency (fastest in market)</span>
</div>
<div className="flex items-center gap-1.5 text-retro-charcoal">
<span className="w-1.5 h-1.5 bg-retro-charcoal rounded-full"></span>
<span>Preferred 2:1 in blind testing</span>
</div>
</div>
</div>
</div>
<div className="px-5 py-2.5 bg-surface-canvas border-t border-retro-border font-label-bracket text-label-bracket text-outline">
            SYS: ZERO-SHOT IDENTITY LATENT
          </div>
</div>
{/*  Model 3: RAVEN [1]  */}
<div className="bg-surface border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between">
<div>
<div className="bg-window-bar-gray px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold text-retro-charcoal">PERCEPTION</span>
<span className="px-1 bg-pastel-lavender border border-retro-border">3x Multimodal</span>
</div>
<div className="p-5">
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Raven [1]
              </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                Translates facial expressions, tone, gaze, emotion, and screen context into rich conversational signals, helping AI respond with empathy and awareness.
              </p>
<div className="space-y-2 pt-2 border-t border-retro-border/60 font-label-code text-[11px]">
<div className="flex items-center gap-1.5 text-retro-charcoal">
<span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
<span>Voice, video &amp; screen fused together</span>
</div>
<div className="flex items-center gap-1.5 text-primary font-bold">
<span className="w-1.5 h-1.5 bg-retro-charcoal rounded-full"></span>
<span>&lt; 300ms context freshness</span>
</div>
</div>
</div>
</div>
<div className="px-5 py-2.5 bg-surface-canvas border-t border-retro-border font-label-bracket text-label-bracket text-outline">
            SYS: CONTINUOUS ATTENTIONAL ROLLING
          </div>
</div>
{/*  Model 4: GRIFFIN [PREVIEW]  */}
<div className="bg-pastel-pink/20 border-2 border-retro-border shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between">
<div>
<div className="bg-hot-pink text-white px-3 py-1.5 border-b border-retro-border flex items-center justify-between font-label-code text-[11px]">
<span className="font-bold">INTERACTION</span>
<span className="px-1 bg-retro-charcoal text-white border border-retro-border uppercase text-[10px]">TURING PASS</span>
</div>
<div className="p-5">
<h3 className="font-headline-md text-headline-md font-headline-md text-retro-charcoal mb-2">
                Griffin [Preview]
              </h3>
<p className="font-body-sm text-body-sm text-on-surface-variant mb-4 leading-relaxed">
                The first human interaction model: a video-to-video model that sees, hears, speaks, and moves at the exact same time, holding face-to-face dialogue.
              </p>
<div className="space-y-2 pt-2 border-t border-retro-border/60 font-label-code text-[11px]">
<div className="flex items-center gap-1.5 text-primary font-bold">
<span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
<span>48% thought it was a real person</span>
</div>
<div className="flex items-center gap-1.5 text-retro-charcoal font-bold">
<span className="w-1.5 h-1.5 bg-retro-charcoal rounded-full"></span>
<span>#1 on NVIDIA VideoFDB</span>
</div>
</div>
</div>
</div>
<div className="px-5 py-2.5 bg-surface-canvas border-t border-retro-border font-label-bracket text-label-bracket text-primary font-bold">
            SYS: REAL-TIME VIDEO-TO-VIDEO MODEL
          </div>
</div>
</div>
</div>
</section>
{/*  SECTION 7: DUAL ACTION CONVERSION CARDS  */}
<section className="w-full bg-surface-canvas py-20">
<div className="max-w-7xl mx-auto px-6">
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
{/*  Card A: PAL Maker  */}
<div className="bg-surface border-2 border-retro-border p-8 shadow-[5px_5px_0px_#1A1A1A] flex flex-col justify-between relative overflow-hidden">
<div className="space-y-4">
<div className="flex items-center justify-between">
<span className="font-label-caps text-label-caps px-2 py-0.5 bg-pastel-yellow border border-retro-border text-retro-charcoal uppercase">
                PAL MAKER • SELF SERVE
              </span>
<span className="font-label-code text-label-code text-on-surface-variant">[ NO-CODE READY ]</span>
</div>
<h3 className="font-display-hero text-headline-lg font-headline-lg text-retro-charcoal">
              Create a PAL and deploy it into action
            </h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Concierge, tutor, interviewer, companion, expert on call. Give it a role, a face, and a knowledge base, then launch it in minutes with PAL Maker.
            </p>
</div>
<div className="mt-8 pt-6 border-t border-retro-border flex flex-wrap items-center gap-4">
<a className="px-6 py-3 bg-hot-pink text-on-primary font-label-caps text-label-caps uppercase border border-retro-border shadow-[2px_2px_0px_#1A1A1A] hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1.5" href="#">
<span>GET STARTED FREE</span>
<span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
</a>
<span className="font-label-code text-[11px] text-on-surface-variant">Includes 3 free hosted video minutes</span>
</div>
</div>
{/*  Card B: Enterprise Solutions  */}
<div className="bg-surface-sand border-2 border-retro-border p-8 shadow-[5px_5px_0px_#1A1A1A] flex flex-col justify-between relative overflow-hidden">
<div className="space-y-4">
<div className="flex items-center justify-between">
<span className="font-label-caps text-label-caps px-2 py-0.5 bg-pastel-lavender border border-retro-border text-retro-charcoal uppercase">
                ENTERPRISE SOLUTIONS
              </span>
<span className="font-label-code text-label-code text-primary font-bold">[ FULLY MANAGED ]</span>
</div>
<h3 className="font-display-hero text-headline-lg font-headline-lg text-retro-charcoal">
              Custom built for your business
            </h3>
<p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Solutions are bespoke, fully managed PAL deployments. Our research team designs, tunes, and scales your PAL from concept to production, tailored to enterprise security and compliance.
            </p>
</div>
<div className="mt-8 pt-6 border-t border-retro-border flex flex-wrap items-center gap-4">
<a className="px-6 py-3 bg-retro-charcoal text-white font-label-caps text-label-caps uppercase border border-retro-border shadow-[2px_2px_0px_#1A1A1A] hover:bg-hot-magenta transition-colors flex items-center gap-1.5" href="#">
<span>TALK TO SALES</span>
<span className="material-symbols-outlined text-sm font-bold">call</span>
</a>
<span className="font-label-code text-[11px] text-on-surface-variant">SOC2 Type II • HIPAA • Dedicated VPC</span>
</div>
</div>
</div>
</div>
</section>
</div></main><footer className="w-full bg-surface-sand border-t-2 border-retro-border mt-space-xxl"><div className="bg-window-bar-gray px-6 py-2 border-b border-retro-border flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-hot-pink border border-retro-border"></div><div className="w-3 h-3 rounded-full bg-pastel-yellow-gold border border-retro-border"></div><div className="w-3 h-3 rounded-full bg-pastel-mint border border-retro-border"></div><span className="ml-3 font-label-code text-label-code text-on-surface-variant">BACK²U_CORE_FRAMEWORK_v3.8.4</span></div><span className="font-label-bracket text-label-bracket text-on-surface-variant">[ STATUS: ALL NODES OPERATIONAL ]</span></div><div className="max-w-7xl mx-auto px-6 py-space-xl grid grid-cols-1 md:grid-cols-6 gap-space-xl"><div className="md:col-span-2 flex flex-col justify-between space-y-space-md"><div className="space-y-space-sm"><div className="flex items-center gap-2"><div className="w-6 h-6 bg-retro-charcoal flex items-center justify-center border border-retro-border rotate-45"><div className="w-2 h-2 bg-surface-canvas -rotate-45"></div></div><span className="font-headline-sm text-headline-sm text-retro-charcoal font-bold">BACK²U</span></div><p className="font-headline-md text-headline-md italic text-on-surface-variant font-headline-md">The human computing company.</p><p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">Pioneering synthetic neural representations and real-time interactive digital human models for frontier computing.</p></div><div className="p-space-sm bg-surface-canvas border border-retro-border shadow-[2px_2px_0px_#1A1A1A] max-w-xs"><span className="font-label-code text-label-code text-primary font-bold block mb-1">[ COMPUTATIONAL MATRIX ]</span><div className="flex flex-wrap gap-1"><span className="text-[10px] font-label-code px-1.5 py-0.5 bg-pastel-lavender border border-retro-border">PHOENIX-2</span><span className="text-[10px] font-label-code px-1.5 py-0.5 bg-pastel-mint border border-retro-border">GRIFFIN-v1</span><span className="text-[10px] font-label-code px-1.5 py-0.5 bg-pastel-sky border border-retro-border">PERCEPTION-API</span></div></div></div><div className="space-y-space-sm"><div className="font-label-caps text-label-caps uppercase text-retro-charcoal border-b border-retro-border pb-1 tracking-wider">Products</div><ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant"><li className="hover:text-primary transition-colors cursor-pointer">Conversational Video</li><li className="hover:text-primary transition-colors cursor-pointer">Replica Engine</li><li className="hover:text-primary transition-colors cursor-pointer">Video Generation API</li><li className="hover:text-primary transition-colors cursor-pointer">Lip-Sync &amp; Blend</li><li className="hover:text-primary transition-colors cursor-pointer">Audio Clone Core</li></ul></div><div className="space-y-space-sm"><div className="font-label-caps text-label-caps uppercase text-retro-charcoal border-b border-retro-border pb-1 tracking-wider">Research</div><ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant"><li className="hover:text-primary transition-colors cursor-pointer">Griffin Model Paper</li><li className="hover:text-primary transition-colors cursor-pointer">Neural Latents</li><li className="hover:text-primary transition-colors cursor-pointer">Real-time Sub-100ms</li><li className="hover:text-primary transition-colors cursor-pointer">Safety &amp; Watermarking</li><li className="hover:text-primary transition-colors cursor-pointer">Benchmarks</li></ul></div><div className="space-y-space-sm"><div className="font-label-caps text-label-caps uppercase text-retro-charcoal border-b border-retro-border pb-1 tracking-wider">Company</div><ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant"><li className="hover:text-primary transition-colors cursor-pointer">About Us</li><li className="hover:text-primary transition-colors cursor-pointer">Careers [HIRING]</li><li className="hover:text-primary transition-colors cursor-pointer">Newsroom</li><li className="hover:text-primary transition-colors cursor-pointer">Brand Assets</li><li className="hover:text-primary transition-colors cursor-pointer">Contact Sales</li></ul></div><div className="space-y-space-sm"><div className="font-label-caps text-label-caps uppercase text-retro-charcoal border-b border-retro-border pb-1 tracking-wider">Legal &amp; Trust</div><ul className="space-y-2 font-body-sm text-body-sm text-on-surface-variant"><li className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</li><li className="hover:text-primary transition-colors cursor-pointer">Terms of Service</li><li className="hover:text-primary transition-colors cursor-pointer">Ethics Charter</li><li className="hover:text-primary transition-colors cursor-pointer">Security &amp; SOC2</li><li className="hover:text-primary transition-colors cursor-pointer">System Status</li></ul></div></div><div className="max-w-7xl mx-auto px-6 py-4 border-t border-retro-border flex flex-col sm:flex-row items-center justify-between gap-4 font-label-code text-label-code text-on-surface-variant"><div>© 2025 BACK²U Inc. All computational rights reserved.</div><div className="flex items-center gap-4"><span className="cursor-pointer hover:text-on-surface">[TWITTER / X]</span><span className="cursor-pointer hover:text-on-surface">[GITHUB]</span><span className="cursor-pointer hover:text-on-surface">[DISCORD]</span><span className="cursor-pointer hover:text-on-surface">[LINKEDIN]</span></div></div></footer>
    </>
  );
}
