import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">다시 오셨군요! 🎾</h1>
          <p className="text-slate-500">테니스 파트너들이 기다리고 있어요.</p>
        </div>

        <form className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input id="email" type="email" placeholder="tennis@example.com" required />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">비밀번호</Label>
              <Link href="#" className="text-sm text-green-600 hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
            <Input id="password" type="password" required />
          </div>

          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
            로그인
          </Button>
        </form>

        <div className="mt-6 text-center text-slate-600">
          아직 계정이 없으신가요?{" "}
          <Link href="/signup" className="text-green-600 font-semibold hover:underline">
            회원가입하기
          </Link>
        </div>
      </div>
    </div>
  );
}