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

  useEffect(() => {
    if (typeof window !== "undefined" && window.kakao?.maps) window.kakao.maps.load(() => setSdkReady(true));
  }, []);

  const [recent, setRecent] = useState<SelectedCourt[]>([]);

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

  // 부천 11곳: 지도가 준비되면 백그라운드에서 한 번에 찾아 두고(브라우저에도 저장), 누르면 바로 선택됩니다.
  const [bucheon, setBucheon] = useState<Record<string, SelectedCourt>>(() => {
    try {
      return JSON.parse(localStorage.getItem("tm_bucheon_courts_v2") ?? "{}");
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (!sdkReady || !window.kakao) return;
    const places = new window.kakao.maps.services.Places();
    BUCHEON_COURTS.forEach((c) => {
      if (bucheon[c.name]) return;
      places.keywordSearch(`부천 ${c.name.replace(/\(.*\)/, "")}`, (data, status) => {
        if (status !== window.kakao.maps.services.Status.OK || data.length === 0) return;
        const core = c.name.replace(/\(.*\)/, "").replace(/테니스장$/, "").trim();
        const p = data.find((d) => d.place_name.includes(core)) ?? data[0];
        const found: SelectedCourt = {
          name: c.name,
          address: p.road_address_name || p.address_name,
          latitude: parseFloat(p.y),
          longitude: parseFloat(p.x),
        };
        setBucheon((prev) => {
          const next = { ...prev, [c.name]: found };
          try {
            localStorage.setItem("tm_bucheon_courts_v2", JSON.stringify(next));
          } catch {
            /* 저장 못 해도 이번 화면에서는 동작 */
          }
          return next;
        });
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady]);

  const pickBucheon = (name: string) => {
    const found = bucheon[name];
    if (!found) {
      // 정확한 위치를 아직 못 찾았으면 엉뚱한 위치로 저장하지 않고 잠시 기다리게 안내
      setErrorMsg("지도에서 정확한 위치를 찾는 중이에요. 잠시 후 다시 눌러 주세요.");
      return;
    }
    setErrorMsg("");
    onSelect(found);
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
          onReady={() => window.kakao.maps.load(() => setSdkReady(true))}
        />
      )}

      {selected && selected.address ? (
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
                  onClick={() => pickBucheon(c.name)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium border surface border-line chip-off-court"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {errorMsg && <p className="text-xs text-danger">{errorMsg}</p>}

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
