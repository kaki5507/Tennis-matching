// lib/dialog.ts
// 브라우저 기본 alert/confirm 대신 쓰는 사이트 전용 팝업. 화면에는 <DialogHost />(layout에 하나)가 그려 줍니다.
// 사용법:  showAlert("저장했어요")   /   if (!(await showConfirm("삭제할까요?", { danger: true }))) return;

export type DialogTone = "ok" | "warn" | "info" | "danger";

export interface DialogRequest {
  id: number;
  kind: "alert" | "confirm";
  message: string;
  title?: string;
  tone: DialogTone;
  okText: string;
  cancelText: string;
  resolve: (v: boolean) => void;
}

export interface DialogOptions {
  title?: string;
  tone?: DialogTone;
  okText?: string;
  cancelText?: string;
  /** 삭제처럼 되돌릴 수 없는 확인창이면 true → 붉은 버튼 */
  danger?: boolean;
}

type Listener = (r: DialogRequest) => void;
let listener: Listener | null = null;
let seq = 0;
const pending: DialogRequest[] = [];

/** DialogHost 가 켜질 때 연결합니다. 그 전에 쌓인 요청은 바로 넘겨 줍니다. */
export function registerDialogHost(l: Listener | null) {
  listener = l;
  if (l) while (pending.length) l(pending.shift()!);
}

/** 문구만 보고 알맞은 색/아이콘을 고릅니다. (필요하면 옵션으로 직접 지정) */
function inferTone(message: string): DialogTone {
  if (/실패|오류|에러|못했|못 했|없습니다|없어요|올바르|불가|안 돼|안돼|거절|잘못/.test(message)) return "danger";
  if (/필요|입력|선택|확인해|다시/.test(message)) return "warn";
  if (/완료|됐|됐어요|되었|성공|저장|감사|환영|보냈|바꿨|만들어/.test(message)) return "ok";
  return "info";
}

function push(req: DialogRequest) {
  if (listener) listener(req);
  else pending.push(req);
}

/** 알림창. 기다릴 필요가 없어서 값을 돌려주지 않습니다. */
export function showAlert(message: unknown, opts: DialogOptions = {}): void {
  const text = typeof message === "string" ? message : message instanceof Error ? message.message : String(message ?? "");
  if (typeof window === "undefined") return;
  push({
    id: ++seq,
    kind: "alert",
    message: text,
    title: opts.title,
    tone: opts.tone ?? inferTone(text),
    okText: opts.okText ?? "확인",
    cancelText: "",
    resolve: () => {},
  });
}

/** 확인창. 확인이면 true, 취소(바깥 클릭/ESC 포함)면 false */
export function showConfirm(message: string, opts: DialogOptions = {}): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  return new Promise<boolean>((resolve) => {
    push({
      id: ++seq,
      kind: "confirm",
      message,
      title: opts.title,
      tone: opts.danger ? "danger" : (opts.tone ?? "info"),
      okText: opts.okText ?? (opts.danger ? "삭제" : "확인"),
      cancelText: opts.cancelText ?? "취소",
      resolve,
    });
  });
}
