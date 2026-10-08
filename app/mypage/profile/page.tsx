// app/mypage/profile/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { getProfile, updateProfile } from "@/app/actions/profile";
import { checkNickname } from "@/app/actions/nickname";
import { getAccessToken } from "@/lib/authToken";
import { fileToAvatarDataUrl } from "@/lib/avatarImage";
import { Position } from "@prisma/client"; // 💡 [추가] any 대신 사용할 정확한 스키마 타입

export default function ProfileEditPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [nickStatus, setNickStatus] = useState<{ ok: boolean; message: string } | null>(null);

  // 💡 [수정] preferredPos에 as Position을 선언하여 TypeScript에게 타입을 확실히 알려줍니다.
  const [formData, setFormData] = useState({
    email: "",
    nickname: "",
    gender: "MALE",
    tennisLevel: "테린이",
    preferredPos: "ANY" as Position, 
  });

  // 프로필 사진: undefined = 바꾸지 않음, null = 삭제, 문자열 = 새 사진
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [currentPhoto, setCurrentPhoto] = useState<string | null>(null);
  const shownPhoto = photo === undefined ? currentPhoto : photo;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setPhoto(await fileToAvatarDataUrl(file));
    } catch (err) {
      alert(err instanceof Error ? err.message : "사진을 처리하지 못했어요.");
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        alert("로그인이 필요합니다.");
        router.push("/login");
        return;
      }

      setFormData((prev) => ({ ...prev, email: authData.user?.email || "" }));

      // DB에서 기존 프로필 정보 불러오기
      const result = await getProfile(await getAccessToken());
      if (result.success && result.user) {
        setCurrentPhoto(result.user.profileUrl ?? null);
        setFormData({
          email: result.user.email,
          nickname: result.user.nickname || "",
          gender: result.user.gender || "MALE",
          tennisLevel: result.user.tennisLevel || "테린이",
          // 불러온 값도 안전하게 Position 타입으로 지정
          preferredPos: (result.user.preferredPos as Position) || "ANY",
        });
      }
    };
    fetchUser();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === "nickname") setNickStatus(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // 💡 [수정] 밉상이었던 as any를 완전히 제거하고, 정확한 형태의 객체를 넘겨줍니다.
    const result = await updateProfile(await getAccessToken(), {
      email: formData.email,
      nickname: formData.nickname,
      gender: formData.gender,
      tennisLevel: formData.tennisLevel,
      preferredPos: formData.preferredPos as Position,
      profileUrl: photo,
    });
    
    if (result.success) {
      alert("프로필이 성공적으로 저장되었습니다! 🎾");
      router.push("/mypage");
      router.refresh();
    } else {
      alert(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen page-bg py-12 px-4">
      <div className="max-w-xl mx-auto surface p-8 rounded-2xl shadow-sm">
        <div className="hero-blue -mx-8 -mt-8 mb-16 rounded-t-2xl px-8 pt-8 pb-14 relative">
          <h1 className="font-display text-2xl text-white">나의 테니스 프로필</h1>
          <p className="text-white/85 text-sm mt-1">사진과 정보를 채우면 파트너 찾기가 쉬워져요.</p>
          <div className="absolute left-8 -bottom-12 flex items-end gap-4">
            {shownPhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shownPhoto} alt="프로필 사진 미리보기" className="w-24 h-24 rounded-full object-cover ring-4 ring-white shadow-md bg-white" />
            ) : (
              <div className="w-24 h-24 rounded-full ring-4 ring-white shadow-md bg-ok-soft text-ok flex items-center justify-center text-3xl font-bold">
                {(formData.nickname || "?").charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-8">
          <label className="btn-outline-court px-4 py-2 rounded-lg text-sm font-medium border cursor-pointer">
            📷 사진 {shownPhoto ? "바꾸기" : "올리기"}
            <input type="file" accept="image/*" className="sr-only" onChange={handlePhoto} />
          </label>
          {shownPhoto && (
            <button type="button" onClick={() => setPhoto(null)} className="text-sm text-slate-500 underline">
              사진 삭제
            </button>
          )}
          <span className="text-xs text-slate-400">정사각형으로 잘라 저장돼요. 저장 버튼을 눌러야 반영돼요.</span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="nickname">닉네임</Label>
            <Input 
              id="nickname" name="nickname" required
              value={formData.nickname} onChange={handleChange} 
              placeholder="예: 테니스왕자" maxLength={20}
              onBlur={async () => {
                if (!formData.nickname.trim()) return;
                const r = await checkNickname(await getAccessToken(), formData.nickname);
                setNickStatus({ ok: r.available, message: r.message });
              }}
              aria-describedby="nickname-status"
            />
            <p id="nickname-status" aria-live="polite" className={`text-xs min-h-4 ${nickStatus ? (nickStatus.ok ? "text-ok" : "text-danger") : "text-ink-muted"}`}>
              {nickStatus ? nickStatus.message : "2~20자, 다른 회원과 겹치지 않아야 해요."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>성별</Label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 surface px-3 py-2 text-sm outline-none focus-ok">
                <option value="MALE">남성 (MALE)</option>
                <option value="FEMALE">여성 (FEMALE)</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>선호 포지션 (특기)</Label>
              <select name="preferredPos" value={formData.preferredPos} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 surface px-3 py-2 text-sm outline-none focus-ok">
                <option value="ANY">상관없음 (ANY)</option>
                <option value="FOREHAND">포핸드 (FOREHAND)</option>
                <option value="BACKHAND">백핸드 (BACKHAND)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>테니스 구력 (레벨)</Label>
            <select name="tennisLevel" value={formData.tennisLevel} onChange={handleChange} className="flex h-10 w-full rounded-md border border-slate-200 surface px-3 py-2 text-sm outline-none focus-ok">
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
            <Button type="submit" disabled={isLoading} className="flex-1 btn-clay text-white">
              {isLoading ? "저장 중..." : "프로필 저장하기"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}