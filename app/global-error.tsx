"use client";

// 최상위 레이아웃까지 문제가 생겼을 때의 마지막 안내 화면 (공통 스타일이 없을 수 있어 자체 스타일 사용)
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#eef2f7", color: "#1c2a40" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 420, textAlign: "center", boxShadow: "0 1px 4px rgba(0,0,0,.08)" }}>
            <p style={{ fontSize: 40, margin: 0 }}>🎾</p>
            <h1 style={{ fontSize: 20, margin: "12px 0 8px" }}>서비스에 문제가 생겼어요</h1>
            <p style={{ fontSize: 14, color: "#5b6b82", lineHeight: 1.6, margin: 0 }}>잠시 후 다시 시도해 주세요.</p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ marginTop: 20, padding: "10px 20px", borderRadius: 8, border: 0, background: "#34577f", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
