// lib/bucheonCourts.ts
// 부천시 공공서비스예약(reserv.bucheon.go.kr) 테니스장 목록.
// lending_info_seq는 https://reserv.bucheon.go.kr/site/main/lending/lendingList?inst_cate=01&lending_inst_nm=tennis
// 에서 직접 확인해 가져온 값입니다. 새 테니스장이 추가되면 이 배열에 수동으로 더해주면 됩니다.

export interface BucheonCourt {
  facilityId: string; // lending_info_seq
  name: string;
  indoor: boolean; // 실내 여부 (오픈 시간이 다를 수 있음)
}

export const BUCHEON_COURTS: BucheonCourt[] = [
  { facilityId: "188", name: "오정레포츠센터 테니스장", indoor: false },
  { facilityId: "205", name: "해그늘체육공원 테니스장(인조잔디)", indoor: false },
  { facilityId: "194", name: "해그늘체육공원 테니스장", indoor: false },
  { facilityId: "116", name: "성주산체육공원테니스장", indoor: false },
  { facilityId: "193", name: "남부수자원테니스장", indoor: false },
  { facilityId: "192", name: "부천체육관테니스장(하드)", indoor: false },
  { facilityId: "115", name: "종합운동장테니스장", indoor: false },
  { facilityId: "114", name: "소사배수지테니스장", indoor: false },
  { facilityId: "112", name: "원미테니스장", indoor: false },
  { facilityId: "111", name: "복사골테니스장", indoor: false },
  { facilityId: "195", name: "부천실내테니스장", indoor: true },
];
