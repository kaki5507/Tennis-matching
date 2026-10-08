// 메인 페이지(서버 컴포넌트).
// 뼈대(히어로/바로가기)는 바로 보내고, DB가 필요한 현황 영역은 준비되는 대로 이어서 채웁니다(스트리밍).
import { Suspense } from "react";
import HomeClient from "./HomeClient";
import HomeLive from "@/components/HomeLive";
import HomeSections from "@/components/HomeSections";

// 현황 숫자는 30초 캐시 (HomeLive 안의 unstable_cache) 라서 페이지도 30초마다만 다시 만듭니다.
export const revalidate = 30;

function LiveSkeleton() {
  return (
    <section className="max-w-6xl mx-auto px-4 pt-6" aria-hidden>
      <div className="surface rounded-2xl h-24 animate-pulse" />
      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <div className="surface rounded-2xl h-32 animate-pulse" />
        <div className="surface rounded-2xl h-32 animate-pulse" />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <HomeClient
      live={
        <Suspense fallback={<LiveSkeleton />}>
          <HomeLive />
        </Suspense>
      }
    >
      <HomeSections />
    </HomeClient>
  );
}
