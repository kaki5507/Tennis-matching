// 메인 페이지(서버 컴포넌트): DB에서 실시간 현황을 읽어 클라이언트 화면(HomeClient)에 끼워 넣습니다.
import HomeClient from "./HomeClient";
import HomeLive from "@/components/HomeLive";
import HomeSections from "@/components/HomeSections";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <HomeClient>
      <HomeLive />
      <HomeSections />
    </HomeClient>
  );
}
