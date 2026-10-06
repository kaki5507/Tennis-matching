import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import PageViewTracker from "@/components/PageViewTracker";
import SiteHeader from "@/components/SiteHeader";
import MaintenanceGate from "@/components/MaintenanceGate";
import { getMaintenanceState } from "@/lib/maintenance";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "테니스매칭 | 우리 동네 테니스 모임",
  description: "실력과 매너로 만나는 테니스 파트너 매칭 서비스",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const maintenance = await getMaintenanceState();
  return (
    <html
      lang="ko"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Noto+Sans+KR:wght@400;500;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ fontFamily: '"Noto Sans KR", var(--font-sans), sans-serif' }}>
        <PageViewTracker />
        <MaintenanceGate initial={maintenance} header={<SiteHeader />}>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  );
}
