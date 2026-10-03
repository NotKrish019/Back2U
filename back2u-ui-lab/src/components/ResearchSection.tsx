import { Image, Box, Target, Network, MessageSquare, ShieldAlert } from 'lucide-react';

export default function ResearchSection() {
  const cards = [
    {
      id: "01",
      header: "VISUAL REPRESENTATION",
      title: "DINOv2",
      description: "Robust visual features,\nlearned without labels",
      body: "DINOv2 provides general-purpose visual representations that can capture useful image features across different images and visual conditions, making it a strong foundation for comparing lost and found item photographs.",
      reference: "REFERENCE: OQUAB ET AL. · 2023",
      icon: <Image size={20} className="text-[var(--color-retro-charcoal)]" />,
      bgColor: "bg-[#fef9f1]",
      iconBg: "bg-[#E4DDF7]" // pastel-lavender
    },
    {
      id: "02",
      header: "OBJECT-CENTRIC DATA",
      title: "Objectron",
      description: "Learning from multiple\nviews of objects",
      body: "Objectron provides object-centric video data with pose annotations and multiple views, giving Back2U a research foundation for understanding how the same physical object can appear differently across photographs.",
      reference: "REFERENCE: AHMADYAN ET AL. · CVPR 2021",
      icon: <Box size={20} className="text-[var(--color-retro-charcoal)]" />,
      bgColor: "bg-[#C4EED0]/30", // pastel-mint/30
      iconBg: "bg-[#C4EED0]"
    },
    {
      id: "03",
      header: "OBJECT DISCOVERY",
      title: "Grounding DINO",
      description: "Finding objects from\nvisual and textual cues",
      body: "Grounding DINO combines vision and language for open-set object detection, allowing objects to be identified using category names or referring expressions rather than relying only on a fixed set of predefined classes.",
      reference: "REFERENCE: LIU ET AL. · 2023",
      icon: <Target size={20} className="text-[var(--color-retro-charcoal)]" />,
      bgColor: "bg-[#fef9f1]",
      iconBg: "bg-[#CDE4FE]" // pastel-sky
    },
    {
      id: "04",
      header: "FINE-GRAINED MATCHING",
      title: "Supervised Contrastive\nLearning",
      description: "Pull similar instances\ntogether, push different ones apart",
      body: "Supervised contrastive learning uses label information to organize representations so that related samples move closer in embedding space while different samples are separated, supporting the fine-grained retrieval objective behind Back2U.",
      reference: "REFERENCE: KHOSLA ET AL. · NEURIPS 2020",
      icon: <Network size={20} className="text-[var(--color-retro-charcoal)]" />,
      bgColor: "bg-[#fef9f1]",
      iconBg: "bg-[#FFD6BE]" // pastel-peach
    },
    {
      id: "05",
      header: "IMAGE + TEXT",
      title: "SigLIP 2",
      description: "Connecting what users see\nwith what they describe",
      body: "SigLIP 2 extends vision-language representation learning and reports improvements in image-text retrieval, localization, and semantic understanding, making it relevant to Back2U's planned image + vague-text retrieval workflow.",
      reference: "REFERENCE: TSCHANNEN ET AL. · 2025",
      icon: <MessageSquare size={20} className="text-[var(--color-retro-charcoal)]" />,
      bgColor: "bg-[#FFF2B2]/30", // pastel-yellow/30
      iconBg: "bg-[#FFF2B2]"
    },
    {
      id: "06",
      header: "UNKNOWN OBJECTS",
      title: "Open-Set\nRecognition",
      description: "Know when a match\nshould not be trusted",
      body: "Open-set recognition addresses the problem of systems encountering objects or classes they were not trained to recognize. This is relevant to Back2U because the retrieval system should not blindly treat every candidate as a valid match.",
      reference: "REFERENCE: BENDALE & BOULT · CVPR 2016",
      icon: <ShieldAlert size={20} className="text-[var(--color-retro-charcoal)]" />,
      bgColor: "bg-[#fef9f1]",
      iconBg: "bg-[#E4DDF7]" // pastel-lavender
    }
  ];

  return (
    <section className="w-full bg-[#FBF9F5] py-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 border-b border-[var(--color-retro-border)] pb-6">
          <div>
            <div className="font-['Space_Mono'] text-[11px] text-[#b90a5a] uppercase font-bold tracking-[0.08em] mb-3">
              [ RESEARCH MATRIX // BACK2U FOUNDATIONS ]
            </div>
            <h2 className="font-['Newsreader'] text-[40px] md:text-[44px] leading-[1.1] font-normal text-[var(--color-retro-charcoal)] max-w-2xl">
              Research that helps Back2U see, match, and reconnect
            </h2>
          </div>
          <p className="font-['Work_Sans'] text-[15px] leading-[24px] text-[#594046] max-w-md mt-4 md:mt-0">
            Back2U builds on established advances in computer vision, representation learning, multimodal retrieval, and open-set recognition to move beyond simple keyword-based lost & found systems.
          </p>
        </div>

        {/* 3x2 Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <div key={idx} className={`${card.bgColor} border-2 border-[var(--color-retro-border)] shadow-[4px_4px_0px_#1A1A1A] flex flex-col justify-between hover:-translate-y-1 transition-transform`}>
              <div>
                <div className="bg-[#E2DDD5] px-3 py-1.5 border-b border-[var(--color-retro-border)] flex items-center justify-between font-['Space_Mono'] text-[11px]">
                  <span className="font-bold text-[var(--color-retro-charcoal)]">{card.header}</span>
                  <span className="text-[#8d7076]">REF.{card.id}</span>
                </div>
                <div className="p-6">
                  <div className={`w-10 h-10 ${card.iconBg} border border-[var(--color-retro-border)] flex items-center justify-center mb-4`}>
                    {card.icon}
                  </div>
                  <h3 className="font-['Newsreader'] text-[24px] md:text-[26px] leading-[1.2] font-medium text-[var(--color-retro-charcoal)] mb-2 whitespace-pre-line">
                    {card.title}
                  </h3>
                  <p className="font-['Work_Sans'] text-[15px] leading-[22px] font-semibold italic text-[var(--color-retro-charcoal)] mb-3 whitespace-pre-line">
                    {card.description}
                  </p>
                  <p className="font-['Work_Sans'] text-[14px] leading-[21px] text-[#594046]">
                    {card.body}
                  </p>
                </div>
              </div>
              <div className="px-6 py-3 bg-[#F5F2EB]/80 border-t border-[var(--color-retro-border)] font-['Space_Mono'] text-[10px] font-bold tracking-[0.02em] text-[#594046]">
                {card.reference}
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}
