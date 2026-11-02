import { TYPES, todayISO, whenText } from "./utils.js";

// Địa chỉ trigger "When an HTTP request is received" của flow Power Automate (đặt trong .env).
const FLOW_URL = import.meta.env.VITE_FLOW_URL;
export const flowConfigured = Boolean(FLOW_URL);

// Tên khoá khớp với tên cột trong SharePoint List.
export function toFlowPayload(r) {
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
    // Chỉ dùng trong flow (điều kiện "cùng ngày" và nội dung tin Teams), không phải cột của List.
    homnay: todayISO(),
    thoigian: w.main + " · " + w.sub,
  };
}

// Content-Type text/plain để trình duyệt không gửi preflight (trigger HTTP của Power Automate không trả CORS cho OPTIONS).
// Flow phải có bước Response kèm header Access-Control-Allow-Origin: *.
export async function sendToFlow(record) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(toFlowPayload(record)),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
  } finally {
    clearTimeout(timer);
  }
}
