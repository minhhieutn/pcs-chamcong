import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import RequestForm from "./components/RequestForm.jsx";
import MyRequests from "./components/MyRequests.jsx";
import AdminView from "./components/AdminView.jsx";
import { IS_ADMIN } from "./config.js";
import {
  LOCAL_UID,
  loadApprovals,
  loadRequests,
  onExternalChange,
  saveApprovals,
  saveRequests,
  storageAvailable,
} from "./storage.js";
import { TYPES, approvalKey } from "./utils.js";

export default function App() {
  const [view, setView] = useState("new");
  const [requests, setRequests] = useState(loadRequests);
  const [approvals, setApprovals] = useState(loadApprovals);
  const [toastMsg, setToastMsg] = useState("");
  const [canStore] = useState(storageAvailable);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 3200);
  }, []);

  useEffect(
    () =>
      onExternalChange(() => {
        setRequests(loadRequests());
        setApprovals(loadApprovals());
      }),
    []
  );

  const statusOf = useCallback((u, id) => approvals[approvalKey(u, id)] || { status: "pending" }, [approvals]);

  const mine = requests.filter((r) => r.uid === LOCAL_UID);
  const pending = requests.filter((r) => statusOf(r.uid, r.id).status === "pending").length;

  const submit = (record) => {
    const id = record.createdAt.toString(36) + Math.random().toString(36).slice(2, 6);
    const next = [...loadRequests(), { ...record, id, uid: LOCAL_UID }];
    saveRequests(next);
    setRequests(next);
    toast("Đã gửi đơn " + TYPES[record.type].l.toLowerCase() + ". Đơn đang chờ duyệt.");
    setView("mine");
  };

  const cancel = (r) => {
    const next = loadRequests().filter((x) => !(x.uid === r.uid && x.id === r.id));
    saveRequests(next);
    setRequests(next);
    toast("Đã huỷ đơn");
  };

  const decide = (r, status, note) => {
    const next = { ...loadApprovals(), [approvalKey(r.uid, r.id)]: { uid: r.uid, reqId: r.id, status, note, decidedAt: Date.now(), decidedBy: LOCAL_UID } };
    saveApprovals(next);
    setApprovals(next);
    toast(status === "approved" ? "Đã duyệt đơn" : "Đã từ chối đơn");
  };

  return (
    <>
      <Header view={view} onChange={setView} isAdmin={IS_ADMIN} pending={pending} />
      <main className="wrap">
        <div id="status" className={"notice warn"} hidden={canStore}>
          Trình duyệt đang chặn lưu trữ cục bộ nên đơn sẽ không được lưu lại sau khi tải lại trang.
        </div>

        <div hidden={view !== "new"}>
          <RequestForm onSubmit={submit} onInvalid={() => toast("Vui lòng kiểm tra lại các ô đánh dấu đỏ")} />
        </div>
        <MyRequests hidden={view !== "mine"} items={mine} statusOf={statusOf} onCancel={cancel} />
        {IS_ADMIN && <AdminView hidden={view !== "admin"} requests={requests} statusOf={statusOf} onDecide={decide} toast={toast} />}
      </main>
      <div className="toast" id="toast" role="status" hidden={!toastMsg}>{toastMsg}</div>
    </>
  );
}
