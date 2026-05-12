import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  adjustFontFallback: true,
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: {
    default: "Kastros HR",
    template: "%s · Kastros HR",
  },
  description: "Secure workforce platform for Kastros — aligned with global trade excellence.",
  applicationName: "Kastros HR",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#14342F",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
