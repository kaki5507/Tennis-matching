"use client";

import { useState } from "react";
import Script from "next/script";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

// 카카오맵 SDK 타입은 프로젝트에 별도 타입 정의가 없어서 최소한의 형태만 선언합니다.
interface KakaoPlace {
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

export interface SelectedCourt {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface Props {
  onSelect: (court: SelectedCourt) => void;
  selected: SelectedCourt | null;
}

export default function CourtSearch({ onSelect, selected }: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlace[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  const handleSearch = async () => {
    setErrorMsg("");
    if (!query.trim()) return;

    if (!appKey) {
      setErrorMsg("지도 서비스가 아직 설정되지 않았습니다. (관리자에게 문의)");
      return;
    }
    if (!sdkReady || !window.kakao) {
      setErrorMsg("지도 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsSearching(true);
    // 사용자가 뭘 입력하든, 우리는 "그 지역 + 테니스장"으로만 검색해서
    // 다른 종류의 장소가 섞여 나오지 않게 합니다.
    const forcedQuery = query.includes("테니스") ? query : `${query} 테니스장`;

    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(forcedQuery, (data, status) => {
      setIsSearching(false);
      if (status !== window.kakao.maps.services.Status.OK) {
        setResults([]);
        setErrorMsg("검색 결과가 없습니다. 다른 지역명으로 시도해보세요.");
        return;
      }
      // 카테고리에 "테니스"가 없는 결과(간혹 섞여 들어오는 관련없는 장소)는 한 번 더 걸러냅니다.
      const filtered = data.filter((p) => p.category_name.includes("테니스") || p.place_name.includes("테니스"));
      setResults(filtered.length > 0 ? filtered : data);
    });
  };

  const handlePick = (place: KakaoPlace) => {
    onSelect({
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      latitude: parseFloat(place.y),
      longitude: parseFloat(place.x),
    });
    setResults([]);
    setQuery("");
  };

  return (
    <div className="space-y-2">
      {appKey && (
        <Script
          src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&libraries=services&autoload=false`}
          strategy="afterInteractive"
          onLoad={() => window.kakao.maps.load(() => setSdkReady(true))}
        />
      )}

      {selected ? (
        <div className="flex items-start justify-between gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-slate-800 text-sm">{selected.name}</div>
              <div className="text-xs text-slate-500">{selected.address}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelect({ name: "", address: "", latitude: 0, longitude: 0 })}
            className="text-xs text-slate-400 hover:text-slate-600 shrink-0"
          >
            변경
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              placeholder="지역/장소명으로 테니스장 검색 (예: 잠실, 올림픽공원)"
              className="flex-1"
            />
            <Button type="button" onClick={handleSearch} disabled={isSearching} variant="outline">
              <Search className="w-4 h-4 mr-1" />
              {isSearching ? "검색 중" : "검색"}
            </Button>
          </div>

          {errorMsg && <p className="text-xs text-red-500">{errorMsg}</p>}

          {results.length > 0 && (
            <ul className="border border-slate-200 rounded-lg divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {results.map((place, idx) => (
                <li key={idx}>
                  <button
                    type="button"
                    onClick={() => handlePick(place)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                  >
                    <div className="font-medium text-slate-800">{place.place_name}</div>
                    <div className="text-xs text-slate-400">{place.road_address_name || place.address_name}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
