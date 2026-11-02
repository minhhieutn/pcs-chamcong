import { TYPES, todayISO, whenText } from "./utils.js";

// Địa chỉ Production URL của node Webhook trong n8n (đặt trong .env).
const WEBHOOK_URL = import.meta.env.VITE_WEBHOOK_URL;
export const webhookConfigured = Boolean(WEBHOOK_URL);

// Tên khoá trùng với tên cột ở dòng tiêu đề của Google Sheet.
export function toWebhookPayload(r) {
  const leave = r.type === "leave";
  const w = whenText(r);
  return {
    madon: r.id,
    hoten: r.name,
    chucvu: r.position,
    phongban: r.department,
    loaidon: TYPES[r.type].l,
    hinhthucnghi: leave ? r.leaveKind : "",
    tungay: leave ? r.fromDate : null,
    denngay: leave ? r.toDate : null,
    buoibatdau: leave ? r.fromPart : "",
    buoiketthuc: leave ? r.toPart : "",
    songay: leave ? r.days : null,
    ngay: leave ? null : r.date,
    tugio: leave ? "" : r.timeFrom,
    dengio: r.timeTo || "",
    sophut: leave ? null : r.minutes,
    lydo: r.reason,
    nguoibangiao: r.handover,
    sdt: r.phone,
    trangthai: "Cho duyet",
    // Chỉ dùng trong workflow n8n (điều kiện "cùng ngày" và nội dung tin nhắn), không phải cột của Sheet.
    homnay: todayISO(),
    thoigian: w.main + " · " + w.sub,
  };
}

// Content-Type text/plain để trình duyệt không gửi preflight.
// Workflow phải trả về header Access-Control-Allow-Origin: * (node Respond to Webhook).
export async function sendToWebhook(record) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(toWebhookPayload(record)),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
  } finally {
    clearTimeout(timer);
  }
}
