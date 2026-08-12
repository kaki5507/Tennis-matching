"use server"

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// 💡 [NEW] 폼에서 넘어오는 데이터들의 '타입 설계도'를 만들어 줍니다.
interface CreateMatchInput {
  hostId: string;
  matchDate: string;
  startTime: string;
  targetLevel: string;
  gameType: string;
  genderRequirement: string;
  ageRequirement: string;
  costPerPerson: string | number; // 문자로 올 수도 있고 숫자로 올 수도 있음
  description: string;
}

export async function createMatchRoom(data: CreateMatchInput) {
  try {
    // 1. 임시 코트장 확인 및 생성 (외래키 연결 에러 방지용)
    let court = await prisma.court.findFirst();
    if (!court) {
      court = await prisma.court.create({
        data: {
          name: "올림픽공원 메인 테니스장",
          address: "서울시 송파구 올림픽로 424",
          latitude: 37.518,
          longitude: 127.123,
          hasParking: true,
          hasShower: true
        }
      });
    }

    // 2. 사용자가 입력한 데이터로 매칭 방(Match) 생성
    const newMatch = await prisma.match.create({
      data: {
        hostId: data.hostId, 
        courtId: court.id,   
        
        matchDate: new Date(data.matchDate),
        startTime: new Date(`1970-01-01T${data.startTime}:00`),
        
        targetLevel: data.targetLevel,
        gameType: data.gameType,
        genderRequirement: data.genderRequirement,
        ageRequirement: data.ageRequirement,
        costPerPerson: typeof data.costPerPerson === 'string' ? parseInt(data.costPerPerson) || 0 : data.costPerPerson, 
        description: data.description
      }
    });

    return { success: true, matchId: newMatch.id };
  } catch (error) {
    console.error("매칭 방 생성 에러:", error);
    return { success: false, error: "방 생성에 실패했습니다." };
  }
}