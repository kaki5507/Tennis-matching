// app/manifest.ts
// 홈 화면에 추가했을 때 "앱"처럼 열리게 하는 설정. 아이폰은 홈 화면 앱으로 열어야만 푸시 알림을 받을 수 있습니다.
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "테니스매칭",
    short_name: "테니스매칭",
    description: "부천 테니스장 빈 코트 찾기와 테니스 파트너 매칭",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f4f7fb",
    theme_color: "#2a4a74",
    icons: [
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  }
}
