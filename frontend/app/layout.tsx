import type { Metadata } from "next";
import localFont from "next/font/local";
import AppShell from "@/components/AppShell";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

// Schibsted Grotesk runs the interface. Source Serif 4 is only for words being edited (messages and drafts).
// The font files live in app/fonts (see the README there), so nothing is fetched from the internet at build time.
const sans = localFont({
  src: "./fonts/schibsted-grotesk-latin-wght-normal.woff2",
  weight: "400 900",
  variable: "--font-sans",
  display: "swap",
});
const serif = localFont({
  src: "./fonts/source-serif-4-latin-wght-normal.woff2",
  weight: "200 900",
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "A support desk where AI drafts the reply and a person signs it off.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
