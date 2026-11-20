import "./globals.css";
import "@/styles/b2.css";
import "react-datepicker/dist/react-datepicker.css";
import localFont from "next/font/local";
import Navigation from "@/components/Navigation";

import TicketStubFooter from "@/components/ui/ticket-stub-footer";

// Geist ships with the repo (OFL) — self-hosted, no layout shift, no third-party request.
const geistSans = localFont({ src: "./fonts/GeistVF.woff", variable: "--font-geist-sans", weight: "100 900", display: "swap" });
const geistMono = localFont({ src: "./fonts/GeistMonoVF.woff", variable: "--font-geist-mono", weight: "100 900", display: "swap" });

export const metadata = {
  title: "Back2U — Campus Lost & Found",
  description: "Find a lost item by photo and description. Back2U compares what you remember with every found report on campus.",
};

export const viewport = {
  themeColor: "#f3efe7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Newsreader is the editorial display face. The older families stay loaded for pages not yet migrated. */}
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300..600;1,6..72,300..500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600;700&family=Syne:wght@600;700;800&family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="b2">
        <a href="#main" className="b2-skip">Skip to content</a>
        <Navigation />
        <main id="main" className="pt-16 min-h-screen flex flex-col">{children}</main>
        <TicketStubFooter
          brand="BACK2U"
          wordmark="BACK2U"
          company="BACK2U"
          eyebrow={[
            "LOST TODAY. BACK TO YOU TOMORROW.",
            "FIND · REUNITE · BELONG",
            "PHOTO · DESCRIPTION · LOCATION → POSSIBLE MATCH",
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
