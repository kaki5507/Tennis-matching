"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

interface KakaoLatLng {
  new (lat: number, lng: number): unknown;
}
interface KakaoMapInstance {
  new (container: HTMLElement, options: { center: unknown; level: number }): unknown;
}
interface KakaoMarkerInstance {
  new (options: { position: unknown; map: unknown }): unknown;
}

declare global {
  interface Window {
    kakao: Window["kakao"] & {
      maps: Window["kakao"]["maps"] & {
        LatLng: KakaoLatLng;
        Map: KakaoMapInstance;
        Marker: KakaoMarkerInstance;
      };
    };
  }
}

interface Props {
  latitude: number;
  longitude: number;
  name: string;
}

export default function CourtMap({ latitude, longitude, name }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  useEffect(() => {
    if (!sdkReady || !mapRef.current || !window.kakao) return;

    const center = new window.kakao.maps.LatLng(latitude, longitude);
    const map = new window.kakao.maps.Map(mapRef.current, { center, level: 4 });
    new window.kakao.maps.Marker({ position: center, map });
  }, [sdkReady, latitude, longitude]);

  if (!appKey) {
    // 키가 없으면 지도를 그리는 대신, 최소한 텍스트로 주소/좌표는 보여줍니다.
    return (
      <div className="w-full h-52 bg-slate-100 rounded-xl flex items-center justify-center text-sm text-slate-400">
        지도를 표시하려면 카카오맵 설정이 필요합니다.
      </div>
    );
  }

  // 좌표가 없는(0,0) 임시 코트인 경우 지도를 그리지 않음
  if (!latitude || !longitude) {
    return (
      <div className="w-full h-52 bg-slate-100 rounded-xl flex items-center justify-center text-sm text-slate-400">
        위치 정보가 등록되지 않은 테니스장입니다.
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => window.kakao.maps.load(() => setSdkReady(true))}
      />
      <div ref={mapRef} role="img" aria-label={`${name} 위치 지도`} className="w-full h-52 rounded-xl overflow-hidden border border-slate-200" />
    </>
  );
}
