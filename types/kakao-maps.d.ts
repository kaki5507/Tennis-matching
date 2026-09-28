// types/kakao-maps.d.ts
// 카카오맵 SDK 전역 타입 선언.
// CourtSearch(장소 검색)와 CourtMap(지도 표시)이 각각 window.kakao를 선언하면
// 서로 다른 타입이라 충돌하므로, 한 곳에 모아서 선언합니다.

export interface KakaoPlace {
  place_name: string;
  address_name: string;
  road_address_name: string;
  category_name: string;
  x: string; // 경도
  y: string; // 위도
}

declare global {
  interface Window {
    kakao: {
      maps: {
        load: (callback: () => void) => void;
        LatLng: new (lat: number, lng: number) => unknown;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
        Marker: new (options: { position: unknown; map: unknown }) => unknown;
        services: {
          Places: new () => {
            keywordSearch: (
              query: string,
              callback: (data: KakaoPlace[], status: string) => void
            ) => void;
          };
          Status: { OK: string };
        };
      };
    };
  }
}
