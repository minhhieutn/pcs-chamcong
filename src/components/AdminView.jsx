import { useMemo, useState } from "react";
import { ST, TYPES, approvalKey, buildCsv, downloadFile, fmtDT, todayISO, whenText } from "../utils.js";

function Row({ r, onDecide }) {
  const w = whenText(r), T = TYPES[r.type], a = r._st;
  const [note, setNote] = useState(a.note || "");
  return (
    <tr>
      <td className="mono">{fmtDT(r.createdAt)}</td>
      <td>
        <b>{r.name}</b>
        <div className="sub">{r.position} · {r.department}</div>
        {r.phone && <div className="sub">SĐT: {r.phone}</div>}
      </td>
      <td><span className="ty" style={{ "--tc": T.c }}>{T.l}</span></td>
      <td>
        <div className="mono" style={{ fontFamily: "var(--f-mono)" }}>{w.main}</div>
        <div className="sub">{w.sub}</div>
      </td>
      <td className="reason">
        {r.reason}
        {r.handover && <div className="sub">Bàn giao: {r.handover}</div>}
      </td>
      <td>
        <span className={"chip st-" + a.status}>{ST[a.status]}</span>
        {a.decidedAt && <div className="sub">{fmtDT(a.decidedAt)}</div>}
        {a.note && <div className="sub">{a.note}</div>}
      </td>
      <td>
        <div className="decide">
          <input placeholder="Ghi chú (không bắt buộc)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="btns">
            <button className="btn sm ok" onClick={() => onDecide(r, "approved", note.trim())}>Duyệt</button>
            <button className="btn sm bad" onClick={() => onDecide(r, "rejected", note.trim())}>Từ chối</button>
          </div>
        </div>
      </td>
    </tr>
  );
}

export default function AdminView({ hidden, requests, statusOf, onDecide, toast }) {
  const [fMonth, setFMonth] = useState(todayISO().slice(0, 7));
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fDep, setFDep] = useState("");
  const [fQ, setFQ] = useState("");

  const items = useMemo(
    () => requests.map((r) => ({ ...r, _st: statusOf(r.uid, r.id) })).sort((a, b) => b.createdAt - a.createdAt),
    [requests, statusOf]
  );
  const pend = items.filter((r) => r._st.status === "pending").length;
  const deps = [...new Set(items.map((r) => r.department).filter(Boolean))].sort();

  const q = fQ.trim().toLowerCase();
  const rows = items.filter((r) => {
    if (fMonth) {
      const a = r.type === "leave" ? r.fromDate : r.date, b = r.type === "leave" ? r.toDate : r.date;
      if (!(a.slice(0, 7) <= fMonth && b.slice(0, 7) >= fMonth)) return false;
    }
    if (fType && r.type !== fType) return false;
    if (fStatus && r._st.status !== fStatus) return false;
    if (fDep && r.department !== fDep) return false;
    if (q && !r.name.toLowerCase().includes(q)) return false;
    return true;
  });

  const cnt = (t) => rows.filter((r) => r.type === t).length;
  const leaveDaysSum = rows.filter((r) => r.type === "leave" && r._st.status !== "rejected").reduce((a, r) => a + (r.days || 0), 0);

  const exportCsv = () => {
    if (!rows.length) {
      toast("Không có dòng nào để xuất");
      return;
    }
    downloadFile("don-xin-phep-" + (fMonth || "tat-ca") + ".csv", buildCsv(rows));
  };

  return (
    <section id="view-admin" hidden={hidden}>
      <div className="kpis" id="kpis">
        <div className={"kpi" + (pend ? " attn" : "")}><div className="n">{pend}</div><div className="l">Đơn chờ duyệt (tất cả)</div></div>
        <div className="kpi"><div className="n">{cnt("leave")}</div><div className="l">Nghỉ phép · {String(leaveDaysSum).replace(".", ",")} ngày</div></div>
        <div className="kpi"><div className="n">{cnt("late")}</div><div className="l">Đi muộn</div></div>
        <div className="kpi"><div className="n">{cnt("early")}</div><div className="l">Về sớm</div></div>
        <div className="kpi"><div className="n">{cnt("out")}</div><div className="l">Ra ngoài giữa giờ</div></div>
      </div>
      <div className="toolbar"><h2>Sổ theo dõi</h2><button className="btn sm" id="btnCsv" onClick={exportCsv}>Xuất Excel (CSV)</button></div>
      <div className="filters">
        <div className="field"><label htmlFor="fMonth">Tháng</label><input type="month" id="fMonth" value={fMonth} onChange={(e) => setFMonth(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="fType">Loại đơn</label>
          <select id="fType" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="leave">Nghỉ phép</option><option value="late">Đi muộn</option><option value="early">Về sớm</option><option value="out">Ra ngoài giữa giờ</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fStatus">Trạng thái</label>
          <select id="fStatus" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="pending">Chờ duyệt</option><option value="approved">Đã duyệt</option><option value="rejected">Từ chối</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="fDep">Phòng ban</label>
          <select id="fDep" value={fDep} onChange={(e) => setFDep(e.target.value)}>
            <option value="">Tất cả</option>
            {deps.map((d) => <option key={d}>{d}</option>)}
          </select>
        </div>
        <div className="field"><label htmlFor="fQ">Tìm theo tên</label><input id="fQ" placeholder="Nhập tên…" value={fQ} onChange={(e) => setFQ(e.target.value)} /></div>
      </div>
      <div className="tablebox">
        <table>
          <thead>
            <tr><th>Ngày gửi</th><th>Nhân viên</th><th>Loại</th><th>Thời gian</th><th>Lý do</th><th>Trạng thái</th><th>Xử lý</th></tr>
          </thead>
          <tbody id="adminRows">
            {!rows.length ? (
              <tr>
                <td colSpan="7">
                  <div className="empty" style={{ border: 0 }}>
                    <b>{items.length ? "Không có đơn khớp bộ lọc" : "Chưa có đơn nào"}</b>
                    {items.length ? "Thử đổi tháng hoặc bỏ bớt bộ lọc." : "Khi nhân viên gửi đơn, đơn sẽ hiện ở đây để bạn duyệt."}
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r) => <Row key={approvalKey(r.uid, r.id) + r._st.status + (r._st.decidedAt || "")} r={r} onDecide={onDecide} />)
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
