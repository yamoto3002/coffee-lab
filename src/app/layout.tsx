import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";


export const metadata: Metadata = {
  applicationName: "Coffee Lab",
  title: "Coffee Lab — 焙煎記録",
  description: "SY-121Nの焙煎、テイスティング、生豆在庫を記録する個人用ツール。",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
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
      <body className="min-h-dvh overflow-x-hidden text-[var(--foreground)]">
        <div className="app-frame flex min-h-dvh flex-col md:flex-row">
          <Navigation />
          <main className="app-main relative min-h-dvh flex-1 overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

