import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BACK²U - Experimental Stitch UI",
  description: "New UI for BACK²U using Stitch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com" rel="preconnect"/>
        <link crossOrigin="anonymous" href="https://fonts.gstatic.com" rel="preconnect"/>
        <link href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      </head>
      <body className="bg-surface font-body-md text-body-md text-on-surface antialiased selection:bg-hot-pink selection:text-white">
        {children}
      </body>
    </html>
  );
}
