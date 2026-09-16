// app/firebase-messaging-sw.js/route.ts
//
// public/ 정적 파일 대신 Route Handler로 서빙하는 이유:
// 서비스워커는 process.env를 못 읽는데, public/ 정적 파일은 빌드 시점에
// 값을 채워넣을 방법이 마땅치 않습니다. 대신 여기서 서버가 실행 시점에
// NEXT_PUBLIC_* 값을 실제로 채워서 자바스크립트를 응답으로 내려줍니다.
// (NEXT_PUBLIC_* 값들은 어차피 브라우저에 노출되는 "공개" 값이라 안전합니다)

export async function GET() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  }

  const script = `
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(config)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  const url = (payload.data && payload.data.url) || "/";

  self.registration.showNotification(title || "테니스 매칭", {
    body: body || "",
    icon: "/icon-192.png",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(clients.openWindow(url));
});
`.trim()

  return new Response(script, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  })
}
