import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";


export const metadata: Metadata = {
  applicationName: "Coffee Lab",
  title: "Coffee Lab — Roast, Taste, Learn",
  description: "焙煎の経過、味の記憶、次の実験を静かにつなぐコーヒーラボ。",
  manifest: "/manifest.webmanifest",
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
      className="h-full antialiased dark"
    >
      <body className="min-h-full text-[#F5F7FA] overflow-x-hidden">
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

