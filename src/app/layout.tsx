import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";


export const metadata: Metadata = {
  title: "Coffee Lab - 焙煎記録データベース",
  description: "コーヒーの生豆、焙煎、テイスティングを記録するデータベース",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
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
      <body className="min-h-full bg-[#0B0B0C] text-[#F4F4F6] font-sans overflow-x-hidden">
        {/* Coffee-themed subtle background overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-0"
          aria-hidden="true"
          style={{
            backgroundImage: 'linear-gradient(180deg, rgba(208, 155, 106, 0.03), transparent 34%, rgba(208, 155, 106, 0.02))',
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

