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
    await prisma.user.upsert({
      where: { id: userId },
      update: {
        nickname: data.nickname,
        gender: data.gender,
        tennisLevel: data.tennisLevel,
        preferredPos: data.preferredPos,
      },
      create: {
        id: userId,
        // 💡 3. ciDi가 스키마에서 필수값이므로 무조건 넣어야 합니다!
        // 본인인증(포트원) 연동 전이므로 임시로 중복되지 않는 userId를 넣어줍니다.
        ciDi: userId, 
        email: data.email,
        nickname: data.nickname,
        gender: data.gender,
        tennisLevel: data.tennisLevel,
        preferredPos: data.preferredPos,
      }
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