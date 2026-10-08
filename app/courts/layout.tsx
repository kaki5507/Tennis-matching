// 관리자 "지금 갱신"(서버 액션)이 11곳을 수집하는 데 시간이 걸릴 수 있어 실행 가능 시간을 늘립니다.
export const maxDuration = 60;

export default function CourtsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
