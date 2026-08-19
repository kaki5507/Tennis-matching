// app/matches/[id]/MatchEvaluation.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getEvaluatees, submitEvaluations } from "@/app/actions/evaluation";

interface Evaluatee {
  id: string;
  nickname: string | null;
  email: string;
}

// 💡 여러 명의 평가 데이터를 관리하기 위한 타입 설계
interface EvalFormData {
  [userId: string]: {
    mannerRating: number;
    ntrpRating: number;
    isNoShow: boolean;
  };
}

export default function MatchEvaluation({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [evaluatees, setEvaluatees] = useState<Evaluatee[]>([]);
  const [evalData, setEvalData] = useState<EvalFormData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchEvaluatees = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData.user?.id;
      
      if (!userId) return;

      const result = await getEvaluatees(matchId, userId);
      
      if (isMounted && result.success && result.evaluatees) {
        setCurrentUserId(userId);
        setEvaluatees(result.evaluatees);

        // 처음 데이터를 불러왔을 때, 모든 사람의 기본 점수를 세팅해 줍니다.
        // (매너: 5점 만점, NTRP: 2.0 기본값)
        const initialData: EvalFormData = {};
        result.evaluatees.forEach((user) => {
          initialData[user.id] = { mannerRating: 5, ntrpRating: 2.0, isNoShow: false };
        });
        setEvalData(initialData);
      }
    };

    fetchEvaluatees();

    return () => { isMounted = false; };
  }, [matchId]);

  // 특정 유저의 점수를 변경할 때 실행되는 함수
  const handleEvalChange = (userId: string, field: string, value: number | boolean) => {
    setEvalData((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    setIsLoading(true);

    // 우리가 만든 서버 액션(API)의 입맛에 맞게 데이터를 배열로 변환합니다.
    const evaluationsPayload = Object.keys(evalData).map((evaluateeId) => ({
      evaluateeId,
      mannerRating: evalData[evaluateeId].mannerRating,
      ntrpRating: evalData[evaluateeId].ntrpRating,
      isNoShow: evalData[evaluateeId].isNoShow,
    }));

    const result = await submitEvaluations(matchId, currentUserId, evaluationsPayload);

    if (result.success) {
      alert("평가가 완료되었습니다! 소중한 피드백 감사합니다. 🎾");
      setIsSubmitted(true);
      router.refresh();
    } else {
      alert(result.error);
    }
    
    setIsLoading(false);
  };

  // 평가할 사람이 없거나(나 혼자 있는 방 등), 이미 제출했다면 렌더링하지 않거나 안내문구를 보여줍니다.
  if (evaluatees.length === 0) return null;
  if (isSubmitted) {
    return (
      <div className="mt-8 bg-green-50 p-6 rounded-xl border border-green-200 text-center text-green-700 font-medium">
        ✅ 동료 평가를 완료했습니다. 
      </div>
    );
  }

  return (
    <div className="mt-12 bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-xl font-bold text-slate-900 mb-2">⭐ 동료 평가 (NTRP & 매너)</h3>
      <p className="text-slate-500 mb-6 text-sm">
        함께 경기한 동료들의 진짜 실력과 매너를 평가해 주세요. (익명으로 반영됩니다)
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {evaluatees.map((user) => (
          <div key={user.id} className="p-5 bg-slate-50 rounded-lg border border-slate-100 flex flex-col md:flex-row gap-6 md:items-center">
            
            {/* 유저 정보 영역 */}
            <div className="flex items-center gap-3 md:w-1/4 shrink-0">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                {(user.nickname || user.email).charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-slate-800 truncate">
                {user.nickname || user.email.split('@')[0]}
              </span>
            </div>

            {/* 평가 입력 영역 */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* NTRP 실력 평가 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">NTRP 평가 (1.0 ~ 5.0+)</label>
                <select 
                  value={evalData[user.id]?.ntrpRating || 2.0}
                  onChange={(e) => handleEvalChange(user.id, "ntrpRating", parseFloat(e.target.value))}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:border-green-600 outline-none"
                >
                  <option value={1.0}>1.0 (입문자)</option>
                  <option value={1.5}>1.5 (초보자)</option>
                  <option value={2.0}>2.0 (랠리 가능)</option>
                  <option value={2.5}>2.5 (방향 조절 가능)</option>
                  <option value={3.0}>3.0 (일관성 있는 타격)</option>
                  <option value={3.5}>3.5 (다양한 구질/컨트롤)</option>
                  <option value={4.0}>4.0 (강한 스트로크/발리)</option>
                  <option value={4.5}>4.5 (위닝샷 보유/대회 입상)</option>
                  <option value={5.0}>5.0+ (선수급/최상위권)</option>
                </select>
              </div>

              {/* 매너 온도 평가 */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">매너 별점</label>
                <select 
                  value={evalData[user.id]?.mannerRating || 5}
                  onChange={(e) => handleEvalChange(user.id, "mannerRating", parseInt(e.target.value))}
                  className="w-full h-10 rounded-md border border-slate-200 px-3 text-sm focus:border-green-600 outline-none"
                >
                  <option value={5}>⭐⭐⭐⭐⭐ (5점 - 최고예요)</option>
                  <option value={4}>⭐⭐⭐⭐ (4점 - 좋았어요)</option>
                  <option value={3}>⭐⭐⭐ (3점 - 보통이에요)</option>
                  <option value={2}>⭐⭐ (2점 - 아쉬워요)</option>
                  <option value={1}>⭐ (1점 - 별로예요)</option>
                </select>
              </div>
            </div>

            {/* 노쇼 체크 */}
            <div className="flex items-center gap-2 md:w-24 shrink-0">
              <input 
                type="checkbox" 
                id={`noshow-${user.id}`}
                checked={evalData[user.id]?.isNoShow || false}
                onChange={(e) => handleEvalChange(user.id, "isNoShow", e.target.checked)}
                className="w-4 h-4 text-red-600 rounded border-slate-300"
              />
              <label htmlFor={`noshow-${user.id}`} className="text-sm font-medium text-red-600 cursor-pointer">
                노쇼 🚨
              </label>
            </div>

          </div>
        ))}

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg font-bold"
        >
          {isLoading ? "제출 중..." : "동료 평가 제출하기"}
        </Button>
      </form>
    </div>
  );
}