import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import PageViewTracker from "@/components/PageViewTracker";
import SiteHeader from "@/components/SiteHeader";
import MaintenanceGate from "@/components/MaintenanceGate";
import { getMaintenanceState } from "@/lib/maintenance";

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
      className={cn("h-full", "antialiased", geistMono.variable, "font-sans")}
    >
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        {/* Pretendard (SIL OFL 1.1 — 상업적 사용 무료). 쓰는 글자 조각만 받는 dynamic subset 이라 가볍습니다. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <PageViewTracker />
        <MaintenanceGate initial={maintenance} header={<SiteHeader />}>
          {children}
        </MaintenanceGate>
      </body>
    </html>
  );
}
