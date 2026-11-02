import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { TYPES, dur, fmtD, leaveDays, timeMinutes, todayISO } from "../utils.js";
import { loadProfile, saveProfile } from "../storage.js";

const TYPE_DESC = {
  leave: "Nghỉ cả ngày hoặc nửa ngày",
  late: "Đến sau giờ vào ca",
  early: "Rời trước giờ tan ca",
  out: "Vắng mặt rồi quay lại",
};

const Req = () => <span className="req">*</span>;

function initialForm() {
  const prof = loadProfile() || {};
  const today = todayISO();
  return {
    name: prof.name || "",
    position: prof.position || "",
    department: prof.department || "",
    type: "leave",
    leaveKind: "Nghỉ phép năm",
    fromDate: today,
    fromPart: "am",
    toDate: today,
    toPart: "pm",
    date: today,
    timeFrom: "",
    timeTo: "",
    shiftStart: "08:00",
    shiftEnd: "17:30",
    reason: "",
    handover: "",
    phone: "",
  };
}

function validate(f) {
  const errs = {};
  const req = (id, msg) => {
    if (!String(f[id]).trim()) errs[id] = msg;
  };
  req("name", "Vui lòng nhập họ và tên");
  req("position", "Vui lòng nhập chức vụ");
  req("department", "Vui lòng nhập phòng ban");
  const t = f.type;
  if (t === "leave") {
    req("fromDate", "Chọn ngày bắt đầu");
    req("toDate", "Chọn ngày kết thúc");
    const d = leaveDays(f);
    if (d === -1) errs.toDate = "Ngày kết thúc phải sau ngày bắt đầu";
    else if (d != null && d <= 0) errs.toDate = "Khoảng thời gian chưa hợp lệ";
  } else {
    req("date", "Chọn ngày");
    req("timeFrom", "Nhập giờ");
    if (t === "out") req("timeTo", "Nhập giờ quay lại");
    const m = timeMinutes(f);
    if (m != null && m <= 0) {
      errs[t === "out" ? "timeTo" : "timeFrom"] =
        t === "late" ? "Giờ đến phải sau giờ vào ca" : t === "early" ? "Giờ về phải trước giờ tan ca" : "Giờ quay lại phải sau giờ ra ngoài";
    }
  }
  if (f.reason.trim().length < 10) errs.reason = "Lý do cần cụ thể hơn (tối thiểu 10 ký tự)";
  return errs;
}

function buildRecord(f) {
  const t = f.type, now = Date.now();
  const r = {
    type: t,
    name: f.name.trim(),
    position: f.position.trim(),
    department: f.department.trim(),
    reason: f.reason.trim(),
    handover: f.handover.trim(),
    phone: f.phone.trim(),
    createdAt: now,
  };
  if (t === "leave") {
    Object.assign(r, { leaveKind: f.leaveKind, fromDate: f.fromDate, fromPart: f.fromPart, toDate: f.toDate, toPart: f.toPart, days: leaveDays(f), sortDate: f.fromDate });
  } else {
    Object.assign(r, {
      date: f.date,
      timeFrom: f.timeFrom,
      timeTo: t === "out" ? f.timeTo : "",
      shiftStart: t === "late" ? f.shiftStart : "",
      shiftEnd: t === "early" ? f.shiftEnd : "",
      minutes: timeMinutes(f),
      sortDate: f.date,
    });
  }
  return r;
}

export default function RequestForm({ onSubmit, onInvalid }) {
  const [f, setF] = useState(initialForm);
  const [errs, setErrs] = useState({});
  const [sending, setSending] = useState(false);
  const formRef = useRef(null);

  const set = (k) => (e) => {
    const v = e.target.value;
    setF((p) => {
      const next = { ...p, [k]: v };
      if (k === "fromDate" && !p.toDate) next.toDate = v;
      return next;
    });
  };

  const t = f.type;

  // Tổng thời gian
  let calcVal = "—", calcNote = "";
  if (t === "leave") {
    const d = leaveDays(f);
    if (d === -1) calcVal = "Ngày kết thúc trước ngày bắt đầu";
    else if (d != null) {
      calcVal = (d % 1 ? d.toFixed(1).replace(".", ",") : d) + " ngày";
      calcNote = "không tính Chủ nhật";
    }
  } else {
    const m = timeMinutes(f);
    if (m != null) calcVal = m > 0 ? dur(m) : "Giờ chưa hợp lệ";
    calcNote = t === "late" ? "so với giờ vào ca" : t === "early" ? "so với giờ tan ca" : "";
  }

  const reset = (e) => {
    e.preventDefault();
    setF((p) => ({ ...p, reason: "", handover: "", phone: "", timeFrom: "", timeTo: "" }));
    setErrs({});
  };

  const submit = async (e) => {
    e.preventDefault();
    if (sending) return;
    const found = validate(f);
    flushSync(() => setErrs(found));
    if (Object.keys(found).length) {
      onInvalid();
      formRef.current?.querySelector(".field.invalid input, .field.invalid textarea, .field.invalid select")?.focus();
      return;
    }
    const r = buildRecord(f);
    saveProfile({ name: r.name, position: r.position, department: r.department });
    setSending(true);
    const ok = await onSubmit(r);
    setSending(false);
    if (ok) {
      setF((p) => ({ ...p, reason: "", handover: "", phone: "", timeFrom: "", timeTo: "" }));
      setErrs({});
    }
  };

  const lblFrom = t === "late" ? "Giờ đến dự kiến" : t === "early" ? "Giờ xin về" : "Ra ngoài từ";

  return (
    <section id="view-new">
      <form id="f" className="sheet" noValidate ref={formRef} onSubmit={submit} onReset={reset}>
        <div className="sheet-head">
          <h2>Đơn xin phép</h2>
          <span className="code" id="today">Ngày lập: {fmtD(todayISO())}</span>
        </div>

        <div className="sec">
          <div className="sec-label">Người làm đơn</div>
          <div className="grid">
            <div className={"field" + (errs.name ? " invalid" : "")}>
              <label htmlFor="name">Họ và tên<Req /></label>
              <input id="name" autoComplete="name" placeholder="VD: Nguyễn Văn An" value={f.name} onChange={set("name")} />
              {errs.name && <span className="err">{errs.name}</span>}
            </div>
            <div className={"field" + (errs.position ? " invalid" : "")}>
              <label htmlFor="position">Chức vụ<Req /></label>
              <input id="position" list="dl-pos" placeholder="VD: Nhân viên chứng từ" value={f.position} onChange={set("position")} />
              {errs.position && <span className="err">{errs.position}</span>}
            </div>
            <div className={"field" + (errs.department ? " invalid" : "")}>
              <label htmlFor="department">Phòng ban<Req /></label>
              <input id="department" list="dl-dep" placeholder="VD: Phòng Xuất nhập khẩu" value={f.department} onChange={set("department")} />
              {errs.department && <span className="err">{errs.department}</span>}
            </div>
          </div>
          <datalist id="dl-pos">
            <option>Nhân viên</option><option>Trưởng nhóm</option><option>Trưởng phòng</option><option>Phó phòng</option><option>Giám đốc</option><option>Thực tập sinh</option>
          </datalist>
          <datalist id="dl-dep">
            <option>Phòng Kinh doanh</option><option>Phòng Chứng từ</option><option>Phòng Khai thác / Vận hành</option><option>Phòng Kế toán</option><option>Phòng Hành chính – Nhân sự</option><option>Phòng Xuất nhập khẩu</option><option>Kho</option>
          </datalist>
        </div>

        <div className="sec">
          <div className="sec-label">Loại đơn</div>
          <div className="types" id="types">
            {Object.keys(TYPES).map((k) => (
              <label key={k} style={{ "--tc": TYPES[k].c }}>
                <input type="radio" name="type" id={"type-" + k} value={k} checked={t === k} onChange={set("type")} />
                <b>{TYPES[k].l}</b>
                <span>{TYPE_DESC[k]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="sec">
          <div className="sec-label">Thời gian</div>
          <div id="t-leave" className="grid" hidden={t !== "leave"}>
            <div className="field">
              <label htmlFor="leaveKind">Hình thức nghỉ<Req /></label>
              <select id="leaveKind" value={f.leaveKind} onChange={set("leaveKind")}>
                <option>Nghỉ phép năm</option><option>Nghỉ ốm</option><option>Nghỉ việc riêng có lương</option><option>Nghỉ không lương</option><option>Nghỉ chế độ (cưới, tang, thai sản…)</option><option>Khác</option>
              </select>
            </div>
            <div className={"field" + (errs.fromDate ? " invalid" : "")}>
              <label htmlFor="fromDate">Từ ngày<Req /></label>
              <input type="date" id="fromDate" value={f.fromDate} onChange={set("fromDate")} />
              {errs.fromDate && <span className="err">{errs.fromDate}</span>}
            </div>
            <div className="field">
              <label htmlFor="fromPart">Bắt đầu từ</label>
              <select id="fromPart" value={f.fromPart} onChange={set("fromPart")}>
                <option value="am">Buổi sáng</option><option value="pm">Buổi chiều</option>
              </select>
            </div>
            <div className={"field" + (errs.toDate ? " invalid" : "")}>
              <label htmlFor="toDate">Đến hết ngày<Req /></label>
              <input type="date" id="toDate" value={f.toDate} onChange={set("toDate")} />
              {errs.toDate && <span className="err">{errs.toDate}</span>}
            </div>
            <div className="field">
              <label htmlFor="toPart">Kết thúc hết</label>
              <select id="toPart" value={f.toPart} onChange={set("toPart")}>
                <option value="pm">Buổi chiều</option><option value="am">Buổi sáng</option>
              </select>
            </div>
          </div>

          <div id="t-time" className="grid" hidden={t === "leave"}>
            <div className={"field" + (errs.date ? " invalid" : "")}>
              <label htmlFor="date">Ngày<Req /></label>
              <input type="date" id="date" value={f.date} onChange={set("date")} />
              {errs.date && <span className="err">{errs.date}</span>}
            </div>
            <div className={"field" + (errs.timeFrom ? " invalid" : "")} id="f-timeFrom">
              <label htmlFor="timeFrom" id="lbl-timeFrom">{lblFrom}<Req /></label>
              <input type="time" id="timeFrom" value={f.timeFrom} onChange={set("timeFrom")} />
              {errs.timeFrom && <span className="err">{errs.timeFrom}</span>}
            </div>
            <div className={"field" + (errs.timeTo ? " invalid" : "")} id="f-timeTo" hidden={t !== "out"}>
              <label htmlFor="timeTo" id="lbl-timeTo">Quay lại lúc<Req /></label>
              <input type="time" id="timeTo" value={f.timeTo} onChange={set("timeTo")} />
              {errs.timeTo && <span className="err">{errs.timeTo}</span>}
            </div>
            <div className="field" id="f-shiftStart" hidden={t !== "late"}>
              <label htmlFor="shiftStart">Giờ vào ca</label>
              <input type="time" id="shiftStart" value={f.shiftStart} onChange={set("shiftStart")} />
            </div>
            <div className="field" id="f-shiftEnd" hidden={t !== "early"}>
              <label htmlFor="shiftEnd">Giờ tan ca</label>
              <input type="time" id="shiftEnd" value={f.shiftEnd} onChange={set("shiftEnd")} />
            </div>
          </div>

          <div className="calc" id="calc">
            <span>Tổng thời gian:</span>
            <b id="calcVal">{calcVal}</b>
            <span className="hint" id="calcNote">{calcNote}</span>
          </div>
        </div>

        <div className="sec">
          <div className="sec-label">Lý do và bàn giao</div>
          <div className={"field" + (errs.reason ? " invalid" : "")}>
            <label htmlFor="reason">Lý do cụ thể<Req /></label>
            <textarea
              id="reason"
              placeholder="Ghi rõ lý do, ví dụ: Đưa con đi khám tại BV Nhi Đồng 1, có giấy hẹn khám lúc 9h00."
              value={f.reason}
              onChange={set("reason")}
            />
            <span className="hint">Tối thiểu 10 ký tự. Lý do càng rõ, quản lý duyệt càng nhanh.</span>
            {errs.reason && <span className="err">{errs.reason}</span>}
          </div>
          <div className="grid">
            <div className="field">
              <label htmlFor="handover">Người nhận bàn giao công việc</label>
              <input id="handover" placeholder="Họ tên đồng nghiệp (nếu có)" value={f.handover} onChange={set("handover")} />
            </div>
            <div className="field">
              <label htmlFor="phone">SĐT liên hệ khi vắng mặt</label>
              <input id="phone" inputMode="tel" placeholder="09xx xxx xxx" value={f.phone} onChange={set("phone")} />
            </div>
          </div>
        </div>

        <div className="actions">
          <button type="reset" className="btn" id="btnReset">Xoá nội dung</button>
          <button type="submit" className="btn primary" id="btnSubmit" disabled={sending}>{sending ? "Đang gửi…" : "Gửi đơn"}</button>
        </div>
      </form>
    </section>
  );
}
