// lib/bucheonScraper.ts
//
// 중요: 이 사이트는 매크로로 "예약(신청/결제)"하는 것을 금지하고 있고,
// 이 코드는 절대 예약을 대신 하지 않습니다. 로그인 없이도 보이는 "예약현황
// (조회)" 페이지를 3시간 간격으로만 읽어서, 예약 가능한 슬롯이 보이면
// 알림만 보내는 용도입니다. 간격을 임의로 줄이거나 예약 신청 자동화 용도로
// 쓰지 마세요.
//
// 목적: "매월 20일 정기 오픈"을 잡아내려는 게 아니라(그건 20일 10시 전후로
// 다들 몰려서 접속이 오히려 불안정함) — 이미 마감된 슬롯을 누군가 "취소"해서
// 다시 예약가능으로 바뀌는 순간을 잡아내는 용도입니다. 그래서 '다음 달'
// 캘린더로 넘어갈 필요 없이, 기본으로 보이는 화면(이번 달)만 주기적으로
// 비교하면 충분합니다.

import * as cheerio from "cheerio";

const BASE_URL = "https://reserv.bucheon.go.kr/site/main/lending/lendingDetail";

export interface AvailableSlot {
  date: string; // DD (일)
  time: string; // "10:00~12:00"
}

function buildUrl(facilityId: string) {
  const params = new URLSearchParams({
    lending_info_seq: facilityId,
    cp: "1",
    pageSize: "16",
    listType: "list",
    inst_cate: "01",
    lending_inst_nm: "tennis",
  });
  return BASE_URL + "?" + params.toString();
}

export async function fetchAvailableSlots(facilityId: string): Promise<AvailableSlot[]> {
  const url = buildUrl(facilityId);

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
