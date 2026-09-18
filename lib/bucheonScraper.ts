// lib/bucheonScraper.ts
//
// 중요: 이 사이트는 매크로로 "예약(신청/결제)"하는 것을 금지하고 있고,
// 이 코드는 절대 예약을 대신 하지 않습니다. 로그인 없이도 보이는 "예약현황
// (조회)" 페이지를 3시간 간격으로만 읽어서, 예약 가능한 슬롯이 보이면
// 알림만 보내는 용도입니다. 간격을 임의로 줄이거나 예약 신청 자동화 용도로
// 쓰지 마세요.

import * as cheerio from "cheerio";

const BASE_URL = "https://reserv.bucheon.go.kr/site/main/lending/lendingDetail";

export interface AvailableSlot {
  date: string; // YYYY-MM-DD
  time: string; // "10:00~12:00"
}

/**
 * 특정 시설(facilityId)의 "현재 화면에 보이는 달"의 예약현황을 가져와,
 * "예약가능"으로 표시된 슬롯만 뽑아냅니다.
 *
 * TODO(확인 필요): 이 사이트가 '다음 달' 캘린더를 URL 파라미터로 바로
 * 열 수 있는지(예: &year=2026&month=10), 아니면 화면 안의 버튼을 눌러야만
 * (JS/AJAX) 넘어가는지 제가 직접 이 도메인에 접속해 검증하지 못했습니다.
 * 브라우저 개발자도구(F12) - 네트워크 탭에서 캘린더 상단의 "10월" 같은
 * 월 이동 링크를 클릭했을 때 어떤 요청(URL 또는 POST 데이터)이 나가는지
 * 확인해서, 아래 buildUrl 함수의 쿼리 파라미터를 실제 값에 맞게 고쳐주세요.
 * (지금은 별도 파라미터 없이 항상 '이번 달' 화면만 가져옵니다)
 */
function buildUrl(facilityId: string, year?: number, month?: number) {
  const params = new URLSearchParams({
    lending_info_seq: facilityId,
    cp: "1",
    pageSize: "16",
    listType: "list",
    inst_cate: "01",
    lending_inst_nm: "tennis",
  });
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  return BASE_URL + "?" + params.toString();
}

export async function fetchAvailableSlots(
  facilityId: string,
  year?: number,
  month?: number
): Promise<AvailableSlot[]> {
  const url = buildUrl(facilityId, year, month);

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("부천시 예약 사이트 응답 실패: " + res.status);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const slots: AvailableSlot[] = [];

  $("table td").each((_, el) => {
    const cellText = $(el).text().replace(/\s+/g, " ").trim();
    if (!cellText) return;

    const dateMatch = cellText.match(/^(\d{1,2})\b/);
    if (!dateMatch) return;
    const day = dateMatch[1].padStart(2, "0");

    const slotRegex = /(\d{2}:\d{2}~\d{2}:\d{2})\s*예약가능/g;
    let m: RegExpExecArray | null;
    while ((m = slotRegex.exec(cellText)) !== null) {
      slots.push({ date: day, time: m[1] });
    }
  });

  return slots;
}
