import type { Metadata } from "next";
import { Instrument_Serif, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured } from "@/lib/env";
import { getViewer } from "@/lib/viewer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Booth",
    template: "%s · Booth",
  },
  description: "Creator pages for TikTok live-streamers. Goals, posts, and member access.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await cookies();
  const viewer = await getViewer();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteHeader viewer={viewer} configured={isSupabaseConfigured()} />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
