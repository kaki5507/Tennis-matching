// lib/region.ts
// 코트 주소에서 지역(시/군/구 단위) 이름을 만드는 순수 함수. (단위 테스트 대상)

/** 주소 앞부분으로 지역(시/군/구 단위) 이름 만들기: "경기도 부천시 ..." → "경기 부천시" */
export function regionOf(address: string): string {
  const t = address.trim().split(/\s+/)
  if (t.length === 0 || !t[0]) return "기타"
  const first = t[0]
    .replace(/특별자치시|특별자치도|특별시|광역시|자치시|자치도/g, "")
    .replace(/(경기|강원|충청북|충청남|전라북|전라남|경상북|경상남|제주)도$/, "$1")
  const second = t[1] && /(시|군|구)$/.test(t[1]) ? t[1] : ""
  return second ? `${first} ${second}` : first
}
