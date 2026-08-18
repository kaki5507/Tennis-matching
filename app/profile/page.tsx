// app/mypage/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { getProfile, updateProfile } from "@/app/actions/profile";

export default function ProfileEditPage() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // DB 스키마에 맞춘 폼 데이터 상태
  // (enum이나 정해진 문자열 제약조건에 맞춰 초기값을 설정합니다)
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    gender: "MALE",        // 스키마 주석: 'MALE' or 'FEMALE'
    tennisLevel: "테린이",  // 자유 입력 또는 정해진 값
    preferredPos: "ANY",   // 스키마 기본값: ANY (FOREHAND, BACKHAND 등)
  });

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      setUserId(authData.user.id);
      setFormData((prev) => ({ ...prev, email: authData.user?.email || "" }));

      // DB에서 기존 프로필 정보 불러오기
      const result = await getProfile(authData.user.id);
      if (result.success && result.user) {
        setFormData({
          email: result.user.email,
          nickname: result.user.nickname || "",
          gender: result.user.gender || "MALE",
          tennisLevel: result.user.tennisLevel || "테린이",
          // DB에 있는 enum 값을 그대로 클라이언트에 세팅합니다.
          preferredPos: result.user.preferredPos || "ANY",
        });
      }
    };
    fetchUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 클라이언트 컴포넌트에서는 타입 단언(as any)을 살짝 활용해 enum 타입 충돌을 방지합니다.
    const result = await updateProfile(userId, formData as any);
    if (result.success) {
      alert("프로필이 성공적으로 저장되었습니다! 🎾");
      router.push("/mypage"); // 저장 후 마이페이지로 이동
      router.refresh();
    } else {
      alert(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">나의 테니스 프로필 설정</h1>
        <p className="text-slate-500 mb-8">매너 있는 매칭을 위해 정확한 정보를 입력해 주세요.</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input 
              id="nickname" name="nickname" required
              value={formData.nickname} onChange={handleChange} 
              placeholder="예: 테니스왕자" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>성별</Label>
              {/* 스키마의 'MALE' or 'FEMALE' 정책에 맞춤 */}
              <select name="gender" value={formData.gender} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600">
                <option value="MALE">남성 (MALE)</option>
                <option value="FEMALE">여성 (FEMALE)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>선호 포지션 (특기)</Label>
              {/* 스키마의 Position Enum 에 맞춤 (필요시 FOREHAND, BACKHAND 등으로 수정 가능) */}
              <select name="preferredPos" value={formData.preferredPos} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600">
                <option value="ANY">상관없음 (ANY)</option>
                <option value="FOREHAND">포핸드 (FOREHAND)</option>
                <option value="BACKHAND">백핸드 (BACKHAND)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>테니스 구력 (레벨)</Label>
            <select name="tennisLevel" value={formData.tennisLevel} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-600">
              <option value="테린이">테린이 (1년 미만)</option>
              <option value="NTRP 2.0">NTRP 2.0 (초급)</option>
              <option value="NTRP 2.5">NTRP 2.5 (초중급)</option>
              <option value="NTRP 3.0">NTRP 3.0 (중급)</option>
              <option value="NTRP 3.5">NTRP 3.5 이상 (고수)</option>
            </select>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              취소
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {isLoading ? "저장 중..." : "프로필 저장하기"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}