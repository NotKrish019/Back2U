import "./globals.css";
import Navigation from "@/components/Navigation";
import { Back2ULoader } from "@/components/Back2ULoader";

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
      </head>
      <body>
        <Back2ULoader />
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
