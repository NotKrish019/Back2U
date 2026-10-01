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
      <body>
        <Back2ULoader />
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  );
}
