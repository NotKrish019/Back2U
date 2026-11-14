import Back2UHero from "@/components/Back2UHero";
import ChoiceSection from "@/components/ChoiceSection";
import Back2UInteractiveSection from "@/components/Back2UInteractiveSection";
import AboutSection from "@/components/AboutSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import ResearchSection from "@/components/ResearchSection";
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";

import { Back2ULoader } from "@/components/Back2ULoader";
import { cookies } from "next/headers";

export default function Home() {
  const cookieStore = cookies();
  const loaderPlayed = cookieStore.get("back2u-loader-played")?.value === "true";

  return (
    <main className="min-h-screen w-full text-black overflow-x-clip relative">
      {!loaderPlayed && <Back2ULoader />}
      {/* Global Background for the lower sections */}
      <GlobalMeshBackground />

      <Back2UHero />
      <ChoiceSection />
      
      {/* The new massive interactive Section 3 */}
      <Back2UInteractiveSection />

      {/* The new Stitch-inspired Section 4 */}
      <AboutSection />

      {/* Workflow Section */}
      <HowItWorksSection />

      <ResearchSection />
    </main>
  );
}
