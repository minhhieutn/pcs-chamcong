import { useEffect, useRef, useState } from "react";
import { ST, TYPES, fmtDT, whenText } from "../utils.js";

function CancelButton({ onConfirm }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const click = () => {
    if (!armed) {
      setArmed(true);
      timer.current = setTimeout(() => setArmed(false), 4000);
      return;
    }
    clearTimeout(timer.current);
    onConfirm();
  };

  return (
    <button className="btn sm bad" onClick={click}>
      {armed ? "Bấm lần nữa để huỷ" : "Huỷ đơn"}
    </button>
  );
}

export default function MyRequests({ hidden, items, onCancel }) {
  const list = [...items].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <section id="view-mine" hidden={hidden}>
      <div className="toolbar">
        <h2>Danh sách đơn đã gửi</h2>
      </div>
      <div id="mineList" className="cards">
        {!list.length ? (
          <div className="empty">
            <b>Bạn chưa có đơn nào</b>
            Đơn bạn gửi sẽ hiện ở đây kèm trạng thái duyệt.
          </div>
        ) : (
          list.map((r) => {
            const w = whenText(r), a = { status: "pending" }, T = TYPES[r.type];
            return (
              <div className="card" style={{ "--tc": T.c }} key={r.id}>
                <div className="row">
                  <span className="ty">{T.l}</span>
                  <span className={"chip st-" + a.status}>{ST[a.status]}</span>
                </div>
                <div className="when">{w.main}</div>
                <div className="meta">{w.sub}</div>
                <div className="reason">{r.reason}</div>
                {a.note && <div className="meta">Ghi chú của quản lý: {a.note}</div>}
                <div className="row">
                  <span className="meta">Gửi lúc {fmtDT(r.createdAt)}</span>
                  {a.status === "pending" && <CancelButton onConfirm={() => onCancel(r)} />}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
