// app/actions/profile.ts
"use server"

// 💡 1. PrismaClient와 함께 Position을 import 합니다.
import { PrismaClient, Position } from "@prisma/client"

const prisma = new PrismaClient()

// 프로필 데이터 타입 설계도
interface ProfileData {
  email: string;
  nickname: string;
  gender: string;
  tennisLevel: string;
  preferredPos: Position; // 💡 2. 소문자 position -> 대문자 Position으로 변경!
}

export async function updateProfile(userId: string, data: ProfileData) {
  try {
    // 프로필 "수정"만 허용합니다. 유저 생성은 회원가입(createUserInDB)에서만 이뤄져야
    // 본인인증(CI/DI)과 약관 동의를 반드시 거칩니다. (이전엔 upsert라서, 가입 없이도
    // 더미 ciDi로 유저가 만들어질 수 있는 우회로가 있었습니다)
    await prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.nickname,
        gender: data.gender,
        tennisLevel: data.tennisLevel,
        preferredPos: data.preferredPos,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("프로필 업데이트 에러:", error);
    return { success: false, error: "프로필 저장에 실패했습니다." };
  }
}

export async function getProfile(userId: string) {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return { success: true, user };
  } catch (error) {
    console.error("get 프로필 조회 에러:", error);
    return { success: false, user: null };
  }
}