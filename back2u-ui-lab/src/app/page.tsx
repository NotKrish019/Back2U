import Back2UHero from "@/components/Back2UHero";
import ChoiceSection from "@/components/ChoiceSection";
import Back2UInteractiveSection from "@/components/Back2UInteractiveSection";
import AboutSection from "@/components/AboutSection";
import ResearchSection from "@/components/ResearchSection";
import GlobalMeshBackground from "@/components/ui/GlobalMeshBackground";
import TicketStubFooter from "@/components/ui/ticket-stub-footer";
export default function Home() {
  return (
    <main className="min-h-screen w-full text-black overflow-x-hidden relative">
      {/* Global Background for the lower sections */}
      <GlobalMeshBackground />

      <Back2UHero />
      <ChoiceSection />
      
      {/* The new massive interactive Section 3 */}
      <Back2UInteractiveSection />

      {/* The new Stitch-inspired Section 4 */}
      <AboutSection />

      {/* The new Research Grid Section 5 */}
      <ResearchSection />

      <TicketStubFooter 
        brand="BACK2U"
        wordmark="BACK2U"
        company="BACK2U"
        eyebrow={[
          "LOST TODAY. BACK TO YOU TOMORROW.",
          "FIND \u00b7 REUNITE \u00b7 BELONG",
          "PHOTO \u00b7 DESCRIPTION \u00b7 LOCATION \u2192 POSSIBLE MATCH",
          "ONE PLACE FOR LOST & FOUND",
          "BUILT FOR CAMPUS LIFE"
        ]}
        headline={["WHAT'S LOST CAN FIND", "ITS WAY BACK2U."]}
        description="Search by photo, description, place, or whatever you remember."
        cta={{ label: "I LOST SOMETHING", href: "/report/lost" }}
        sections={[
          { label: "FIND" },
          { label: "MATCH" },
          { label: "VERIFY" },
          { label: "REUNITE" },
          { label: "BELONG" }
        ]}
        linkGroups={[
          {
            title: "FIND & RECOVER",
            links: [
              { label: "Search", href: "/search" },
              { label: "Browse", href: "/browse" },
              { label: "Hotspots", href: "/hotspots" },
              { label: "Report Lost", href: "/report/lost" },
              { label: "Report Found", href: "/report/found" }
            ],
          },
          {
            title: "BACK2U",
            links: [
              { label: "My Reports", href: "/reports" },
              { label: "Support", href: "/support" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" }
            ],
          },
        ]}
        blurb="Back2U combines image understanding, textual description and contextual signals to retrieve and rank possible matches for the same physical item."
      />
    </main>
  );
}
