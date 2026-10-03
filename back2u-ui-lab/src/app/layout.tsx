import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import Navigation from "@/components/Navigation";

import TicketStubFooter from "@/components/ui/ticket-stub-footer";
import { CursorFollower } from "@/components/ui/cursor-follower";

export const metadata = {
  title: "Back2U | UI Lab",
  description: "Minimal Wireframe",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body>
        <CursorFollower />
        <Navigation />
        <main className="pt-[100px] min-h-screen flex flex-col">{children}</main>
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
      </body>
    </html>
  );
}
