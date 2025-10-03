import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./providers";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrepTalk - Land Your Dream Job",
  description: "Transform interview anxiety into confidence. Get role-specific mock interviews with expert AI feedback tailored to your target job. Practice realistic scenarios and ace your next interview.",
  keywords: [
    "interview preparation",
    "mock interviews",
    "job interview practice",
    "AI interview coach",
    "interview feedback",
    "career coaching",
    "interview confidence",
    "technical interview prep",
    "behavioral interview practice",
  ],
  authors: [{ name: "PrepTalk" }],
  openGraph: {
    title: "PrepTalk - Land Your Dream Job with AI Interview Practice",
    description: "Role-specific mock interviews with actionable feedback. Stop generic prep, start practicing for YOUR job.",
    type: "website",
    url: "https://preptalk.app",
    siteName: "PrepTalk",
  },
  twitter: {
    card: "summary_large_image",
    title: "PrepTalk - Land Your Dream Job with AI Interview Practice",
    description: "Role-specific mock interviews with actionable feedback. Stop generic prep, start practicing for YOUR job.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
