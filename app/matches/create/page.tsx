"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import { createMatchRoom } from "@/app/actions/match";
import { getProfile } from "@/app/actions/profile"; // 👈 유저 진짜 점수 가져오기용

export default function CreateMatchPage() {
  const router = useRouter();
  
  // 로그인한 유저 ID 및 상태
  const [hostId, setHostId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🌟 내 진짜 NTRP를 저장할 상태
  const [myRoundedNtrp, setMyRoundedNtrp] = useState<number>(2.0); 
  const [isVerified, setIsVerified] = useState(false);

  // 폼에 입력할 데이터들 상태 관리
  const [formData, setFormData] = useState({
    matchDate: "",
    startTime: "",
    gameType: "단식",
    targetLevel: "누구나", // 기본값
    genderRequirement: "제한없음",
    ageRequirement: "제한없음",
    costPerPerson: "",
    description: "",
  });

  // 화면이 켜지면 로그인 상태 확인 + 프로필(NTRP 점수) 불러오기
  useEffect(() => {
    const fetchAuthAndProfile = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        alert("로그인이 필요한 서비스입니다.");
        router.push("/login");
        return;
      }
      setHostId(data.user.id);

      // 내 프로필에서 평가 횟수와 점수를 가져옵니다.
      const profileResult = await getProfile(data.user.id);
      if (profileResult.success && profileResult.user) {
        const evalCount = profileResult.user.ntrpCount || 0;
        const rawScore = profileResult.user.ntrpScore ? Number(profileResult.user.ntrpScore) : 2.0;
        
        // 내 점수를 0.5 단위로 뭉뚱그려(익명화) 계산합니다.
        const rounded = Math.round(rawScore * 2) / 2;
        
        setMyRoundedNtrp(rounded);
        setIsVerified(evalCount >= 3); // 3회 이상이어야 검증됨
      }
    };
    
    fetchAuthAndProfile();
  }, [router]);

  // 입력창 값이 바뀔 때마다 상태를 업데이트하는 함수
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 등록 버튼 눌렀을 때 실행
  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const result = await createMatchRoom({ ...formData, hostId });

    if (result.success) {
      alert("매칭 방이 성공적으로 만들어졌습니다! 🎾");
      // 🌟 [수정] 메인 화면 대신, 방금 만든 방의 상세 페이지로 바로 꽂아줍니다!
      router.push(`/matches/${result.matchId}`); 
    } else {
      alert(result.error);
    }
    
    setIsLoading(false);
  };

  // 🌟 내 점수를 기준으로 선택할 수 있는 4가지 타겟 레벨 옵션 계산
  const minLevel = Math.max(1.0, myRoundedNtrp - 0.5).toFixed(1);
  const currentLevel = myRoundedNtrp.toFixed(1);
  const maxLevel = (myRoundedNtrp + 0.5).toFixed(1);

  const levelOptions = [
    { label: "누구나 (초보 환영)", value: "누구나" },
    { label: `비슷한 실력 (${minLevel} ~ ${maxLevel})`, value: `${minLevel}-${maxLevel}` },
    { label: `조금 더 잘 치는 분 (${currentLevel} ~ ${maxLevel})`, value: `${currentLevel}-${maxLevel}` },
    { label: `조금 더 초보인 분 (${minLevel} ~ ${currentLevel})`, value: `${minLevel}-${currentLevel}` },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">새로운 매칭 방 만들기</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 날짜 및 시간 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="matchDate">경기 날짜</Label>
              <Input type="date" id="matchDate" name="matchDate" value={formData.matchDate} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">시작 시간</Label>
              <Input type="time" id="startTime" name="startTime" value={formData.startTime} onChange={handleChange} required />
            </div>
          </div>

          {/* 2. 게임 종류 & 실력 조건 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>게임 종류</Label>
              <select name="gameType" value={formData.gameType} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600">
                <option value="단식">단식</option>
                <option value="복식">복식</option>
                <option value="혼합복식">혼합복식</option>
                <option value="랠리(연습)">랠리(연습)</option>
              </select>
            </div>
            
            {/* 🌟 [수정] 요구 실력 드롭다운 자동화 적용 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>요구 실력</Label>
                {isVerified ? (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    내 기준: {myRoundedNtrp.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    기본 기준: 2.0 (검증 중)
                  </span>
                )}
              </div>
              <select name="targetLevel" value={formData.targetLevel} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-600">
                {levelOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 3. 참가비 (N빵 자동화 대비) */}
          <div className="space-y-2">
            <Label htmlFor="costPerPerson">1인당 참가비 (원)</Label>
            <Input type="number" id="costPerPerson" name="costPerPerson" value={formData.costPerPerson} onChange={handleChange} placeholder="예: 6000 (코트비+공값 1/N)" />
          </div>

          {/* 4. 상세 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">상세 설명 및 공지사항</Label>
            <Textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              placeholder="예: 2시간 복식 진행합니다. 공은 새것으로 준비할게요! 우천 시 코트장 규정에 따라 환불해 드립니다." 
              className="h-32"
            />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
            {isLoading ? "방 생성 중..." : "방 만들기 🚀"}
          </Button>
        </form>
      </div>
    </div>
  );
}