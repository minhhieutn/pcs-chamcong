export const TYPES = {
  leave: { l: "Nghỉ phép", c: "var(--t-leave)" },
  late: { l: "Đi muộn", c: "var(--t-late)" },
  early: { l: "Về sớm", c: "var(--t-early)" },
  out: { l: "Ra ngoài giữa giờ", c: "var(--t-out)" },
};
export const ST = { pending: "Chờ duyệt", approved: "Đã duyệt", rejected: "Từ chối" };

const pad = (n) => String(n).padStart(2, "0");
export const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
};
export const fmtD = (s) => {
  if (!s) return "";
  const [y, m, d] = s.split("-");
  return d + "/" + m + "/" + y;
};
export const fmtDT = (ms) => {
  const d = new Date(ms);
  return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear() + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
};
export const toMin = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const dur = (m) => {
  if (m == null || m <= 0) return "—";
  const h = Math.floor(m / 60), r = m % 60;
  return (h ? h + " giờ " : "") + (r ? r + " phút" : "").trim();
};

// Tính số ngày nghỉ: mỗi ngày = 1, trừ nửa ngày ở hai đầu, không tính Chủ nhật
export function leaveDays(f) {
  const a = f.fromDate, b = f.toDate;
  if (!a || !b) return null;
  const d1 = new Date(a + "T00:00"), d2 = new Date(b + "T00:00");
  if (d2 < d1) return -1;
  let n = 0;
  for (let d = new Date(d1); d <= d2; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) n += 1;
  }
  if (f.fromPart === "pm" && d1.getDay() !== 0) n -= 0.5;
  if (f.toPart === "am" && d2.getDay() !== 0) n -= 0.5;
  return n;
}

export function timeMinutes(f) {
  const t = f.type, from = toMin(f.timeFrom), to = toMin(f.timeTo), ss = toMin(f.shiftStart), se = toMin(f.shiftEnd);
  if (t === "late") return from != null && ss != null ? from - ss : null;
  if (t === "early") return from != null && se != null ? se - from : null;
  if (t === "out") return from != null && to != null ? to - from : null;
  return null;
}

export function whenText(r) {
  if (r.type === "leave") {
    const p = { am: "sáng", pm: "chiều" };
    const same = r.fromDate === r.toDate;
    const span = same
      ? fmtD(r.fromDate) + (r.fromPart === r.toPart ? " (buổi " + p[r.fromPart] + ")" : "")
      : fmtD(r.fromDate) + (r.fromPart === "pm" ? " chiều" : "") + " → " + fmtD(r.toDate) + (r.toPart === "am" ? " sáng" : "");
    return { main: span, sub: (r.leaveKind || "") + " · " + String(r.days).replace(".", ",") + " ngày" };
  }
  if (r.type === "late") return { main: fmtD(r.date) + " · đến " + r.timeFrom, sub: "Muộn " + dur(r.minutes) + " (ca " + r.shiftStart + ")" };
  if (r.type === "early") return { main: fmtD(r.date) + " · về " + r.timeFrom, sub: "Sớm " + dur(r.minutes) + " (tan ca " + r.shiftEnd + ")" };
  return { main: fmtD(r.date) + " · " + r.timeFrom + "–" + r.timeTo, sub: "Vắng " + dur(r.minutes) };
}

export const approvalKey = (u, id) => u + "__" + id;

export function buildCsv(rows) {
  const head = ["Ngày gửi", "Họ và tên", "Chức vụ", "Phòng ban", "Loại đơn", "Hình thức nghỉ", "Từ ngày", "Đến ngày", "Số ngày", "Ngày", "Từ giờ", "Đến giờ", "Số phút", "Lý do", "Bàn giao", "SĐT", "Trạng thái", "Ghi chú duyệt"];
  const q = (v) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  const lines = rows.map((r) =>
    [
      fmtDT(r.createdAt), r.name, r.position, r.department, TYPES[r.type].l, r.leaveKind || "",
      r.fromDate ? fmtD(r.fromDate) + (r.fromPart === "pm" ? " (chiều)" : "") : "",
      r.toDate ? fmtD(r.toDate) + (r.toPart === "am" ? " (sáng)" : "") : "",
      r.days ?? "",
      r.date ? fmtD(r.date) : "", r.timeFrom || "", r.timeTo || "", r.minutes ?? "",
      r.reason, r.handover, r.phone, ST[r._st.status], r._st.note || "",
    ].map(q).join(",")
  );
  return "﻿" + [head.map(q).join(","), ...lines].join("\r\n");
}

export function downloadFile(filename, data, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
