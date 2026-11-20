import Story from "@/components/story/Story";
import QuickSearch from "@/components/home/QuickSearch";
import Exchange from "@/components/exchange/Exchange";
import JourneyBack from "@/components/journey/JourneyBack";
import ResearchSection from "@/components/ResearchSection";
import ScrollFX from "@/components/home/ScrollFX";

import { Back2ULoader } from "@/components/Back2ULoader";
import { cookies } from "next/headers";

export default function Home() {
  const cookieStore = cookies();
  const loaderPlayed = cookieStore.get("back2u-loader-played")?.value === "true";

  return (
    <div className="w-full overflow-x-clip relative">
      {!loaderPlayed && <Back2ULoader />}
      {/* I–V: one continuous, scroll-driven 3D story */}
      <Story />
      {/* V made real: the search starts here */}
      <QuickSearch />
      {/* 04 · The journey back */}
      <JourneyBack />
      {/* 02 · Two sides of every item — The Exchange */}
      <Exchange />
      <ResearchSection />
      <ScrollFX />
    </div>
  );
}
