"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/app/actions/admin";
import { createTournament } from "@/app/actions/tournament";
import CourtSearch, { SelectedCourt } from "@/components/CourtSearch";
import { findOrCreateCourt } from "@/app/actions/court";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TennisLoader from "@/components/TennisLoader";

export default function CreateTournamentPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "denied" | "ok">("checking");
  const [adminId, setAdminId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [selectedCourt, setSelectedCourt] = useState<SelectedCourt | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    startDate: "",
    registrationDeadline: "",
    minNtrp: "2.0",
    maxNtrp: "3.0",
    minMannerScore: "",
    maxParticipants: "16",
  });

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return router.push("/login");
      const admin = await isAdmin(data.user.id);
      if (!admin) return setStatus("denied");
      setAdminId(data.user.id);
      setStatus("ok");
    };
    check();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!selectedCourt || !selectedCourt.address) {
      return setErrorMsg("대회가 열릴 테니스장을 검색해서 선택해주세요.");
    }
    if (parseFloat(form.minNtrp) > parseFloat(form.maxNtrp)) {
      return setErrorMsg("최소 실력이 최대 실력보다 클 수 없습니다.");
    }

    setIsLoading(true);
    const courtResult = await findOrCreateCourt(selectedCourt);
    if (!courtResult.success || !courtResult.courtId) {
      setErrorMsg(courtResult.error ?? "테니스장 저장에 실패했습니다.");
      setIsLoading(false);
      return;
    }

    const result = await createTournament(adminId, {
      title: form.title,
      description: form.description,
      courtId: courtResult.courtId,
      startDate: form.startDate,
      registrationDeadline: form.registrationDeadline,
      minNtrp: parseFloat(form.minNtrp),
      maxNtrp: parseFloat(form.maxNtrp),
      minMannerScore: form.minMannerScore ? parseFloat(form.minMannerScore) : null,
      maxParticipants: parseInt(form.maxParticipants, 10),
    });

    if (!result.success || !result.tournamentId) {
      setErrorMsg(result.error ?? "대회 개설에 실패했습니다.");
      setIsLoading(false);
      return;
    }

    alert(`대회가 개설됐어요! 조건에 맞는 ${result.notifiedCount ?? 0}명에게 알림을 보냈습니다.`);
    router.push(`/tournaments/${result.tournamentId}`);
  };

  if (status === "checking") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16">
        <TennisLoader label="권한 확인 중..." />
      </div>
    );
  }
  if (status === "denied") {
    return <div className="max-w-md mx-auto px-4 py-24 text-center text-slate-500">관리자만 접근할 수 있는 페이지입니다.</div>;
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "var(--mist)" }}>
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="font-display text-2xl mb-6" style={{ color: "var(--court)" }}>
          🏆 대회 개설
        </h1>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{errorMsg}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">대회명</Label>
            <Input id="title" name="title" value={form.title} onChange={handleChange} required placeholder="예: 가을맞이 초급부 리그전" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">대회 소개 (선택)</Label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-green-600"
            />
          </div>

          <div className="space-y-2">
            <Label>대회 장소</Label>
            <CourtSearch selected={selectedCourt} onSelect={setSelectedCourt} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">대회 날짜</Label>
              <Input type="date" id="startDate" name="startDate" value={form.startDate} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registrationDeadline">신청 마감</Label>
              <Input type="datetime-local" id="registrationDeadline" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange} required />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minNtrp">최소 NTRP</Label>
              <Input type="number" step="0.1" id="minNtrp" name="minNtrp" value={form.minNtrp} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxNtrp">최대 NTRP</Label>
              <Input type="number" step="0.1" id="maxNtrp" name="maxNtrp" value={form.maxNtrp} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxParticipants">정원</Label>
              <Input type="number" id="maxParticipants" name="maxParticipants" value={form.maxParticipants} onChange={handleChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minMannerScore">최소 매너 온도 (선택, 비우면 제한없음)</Label>
            <Input type="number" step="0.1" id="minMannerScore" name="minMannerScore" value={form.minMannerScore} onChange={handleChange} placeholder="예: 36.5" />
          </div>

          <Button type="submit" disabled={isLoading} className="w-full h-12 text-white text-lg" style={{ background: "var(--clay)" }}>
            {isLoading ? "개설 중..." : "대회 개설하고 알림 보내기"}
          </Button>
        </form>
      </div>
    </div>
  );
}
