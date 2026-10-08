"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";
import type { KakaoPlace } from "@/types/kakao-maps";
import { BUCHEON_COURTS } from "@/lib/bucheonCourts";
import { getMyFrequentCourts } from "@/app/actions/court";
import { getAccessToken } from "@/lib/authToken";

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

  const [recent, setRecent] = useState<SelectedCourt[]>([]);
  const [picking, setPicking] = useState("");

  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY;

  // 내가 최근/자주 쓴 테니스장 (로그인 안 했으면 빈 목록)
  useEffect(() => {
    let alive = true;
    (async () => {
      const list = await getMyFrequentCourts(await getAccessToken());
      if (alive) setRecent(list);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 부천 11곳: 눌렀을 때 지도에서 정확한 주소/좌표를 찾아 채움 (지도가 아직이면 주소 없이 이름으로 대체)
  const pickBucheon = (name: string) => {
    const fallback = () =>
      onSelect({ name, address: `경기도 부천시 ${name}`, latitude: 37.5035, longitude: 126.766 });
    if (!sdkReady || !window.kakao) return fallback();
    setPicking(name);
    const places = new window.kakao.maps.services.Places();
    places.keywordSearch(`부천 ${name.replace(/\(.*\)/, "")}`, (data, status) => {
      setPicking("");
      if (status !== window.kakao.maps.services.Status.OK || data.length === 0) return fallback();
      const p = data[0];
      onSelect({
        name,
        address: p.road_address_name || p.address_name,
        latitude: parseFloat(p.y),
        longitude: parseFloat(p.x),
      });
    });
  };

  const recentNames = new Set(recent.map((c) => c.name));

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
        <div className="flex items-start justify-between gap-3 p-3 bg-ok-soft border border-ok rounded-lg">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-ok mt-0.5 shrink-0" />
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
          {recent.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-bold">⭐ 최근·자주 이용한 코트</p>
              <div className="flex flex-wrap gap-1.5">
                {recent.map((c) => (
                  <button
                    key={c.address}
                    type="button"
                    onClick={() => onSelect(c)}
                    className="px-3 py-1.5 rounded-full text-sm font-medium border surface border-line chip-off-court"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-bold">🎾 부천 테니스장 (많이 이용해요)</p>
            <div className="flex flex-wrap gap-1.5">
              {BUCHEON_COURTS.filter((c) => !recentNames.has(c.name)).map((c) => (
                <button
                  key={c.facilityId}
                  type="button"
                  disabled={picking !== ""}
                  onClick={() => pickBucheon(c.name)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border surface border-line chip-off-court disabled:opacity-60"
                >
                  {picking === c.name ? "찾는 중…" : c.name}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs text-ink-muted pt-1">목록에 없다면 지도에서 검색하세요</p>
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } }}
              placeholder="다른 지역 테니스장 검색 (예: 잠실, 올림픽공원)"
              className="flex-1"
            />
            <Button type="button" onClick={handleSearch} disabled={isSearching} variant="outline">
              <Search className="w-4 h-4 mr-1" />
              {isSearching ? "검색 중" : "검색"}
            </Button>
          </div>

          {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

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
