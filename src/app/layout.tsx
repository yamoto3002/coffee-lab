import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coffee Lab - 焙煎研究データベース",
  description: "再現性と分析性を極限まで高めた、本格コーヒー焙煎データベース",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full bg-[#0B0B0C] text-[#F4F4F6] font-sans overflow-x-hidden">
        {/* Coffee-themed subtle background overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          aria-hidden="true"
          style={{
            backgroundImage: `
              radial-gradient(ellipse at 15% 30%, rgba(208, 155, 106, 0.04) 0%, transparent 50%),
              radial-gradient(ellipse at 85% 70%, rgba(100, 50, 10, 0.05) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(30, 15, 5, 0.08) 0%, transparent 80%)
            `,
          }}
        />
        <div className="flex min-h-screen flex-col md:flex-row relative z-10">
          <Navigation />
          <main className="flex-1 pb-20 md:pb-0 min-h-screen relative overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
