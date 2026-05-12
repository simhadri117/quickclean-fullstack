import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MapsProvider } from "@/lib/MapsProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickClean | Premium Home Cleaning Services",
  description: "Book professional home cleaning in minutes. Instant booking, vetted professionals, and live tracking.",
};

import AIChat from "@/components/AIChat";
import SocialProof from "@/components/SocialProof";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MapsProvider>
          {children}
          <AIChat />
          <SocialProof />
          <Analytics />
        </MapsProvider>
      </body>
    </html>
  );
}
