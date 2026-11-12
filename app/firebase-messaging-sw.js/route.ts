// app/firebase-messaging-sw.js/route.ts
//
// 푸시 알림용 서비스워커. 브라우저(탭)가 닫혀 있어도 이 파일이 깨어나서 알림을 띄웁니다.
//
// 예전에는 여기서 Firebase SDK 를 외부(gstatic)에서 내려받아 썼는데, 서비스워커가 깨어날 때마다
// 그 다운로드가 끝나야 알림이 떠서, 느리거나 실패하면 알림이 아예 안 뜨는 문제가 있었습니다.
// (특히 아이폰은 "푸시를 받았는데 알림을 안 띄운" 일이 반복되면 구독 자체를 끊어 버립니다)
// 그래서 외부 스크립트 없이 표준 push 이벤트만으로 처리합니다. 토큰 발급은 화면 쪽 Firebase SDK 가 그대로 합니다.

export async function GET() {
  const script = `
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch (e) { payload = {}; }
  const n = payload.notification || {};
  const d = payload.data || {};
  const title = n.title || d.title || "테니스매칭";
  const body = n.body || d.body || "";
  const url = d.url || (payload.fcmOptions && payload.fcmOptions.link) || "/";
  // push 이벤트에서는 반드시 알림을 띄워야 합니다 (안 띄우면 브라우저가 구독을 끊을 수 있음)
  const jobs = [
    self.registration.showNotification(title, {
      body,
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      data: { url },
    }),
  ];
  // 홈 화면 아이콘의 빨간 숫자 (지원하는 기기에서만)
  const count = Number(d.badge);
  if (self.navigator && self.navigator.setAppBadge && count > 0) {
    jobs.push(self.navigator.setAppBadge(count).catch(() => {}));
  }
  event.waitUntil(Promise.all(jobs));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      // 같은 사이트 주소면 이미 열린 창을 앞으로 가져오고, 아니면(예약 사이트 등) 새로 엽니다
      for (const c of list) {
        if (c.url === new URL(url, self.location.origin).href && "focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
`.trim()

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  })
}
