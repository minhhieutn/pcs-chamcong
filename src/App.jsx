import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import RequestForm from "./components/RequestForm.jsx";
import MyRequests from "./components/MyRequests.jsx";
import { LOCAL_UID, loadLastSent, loadRequests, onExternalChange, saveLastSent, saveRequests, storageAvailable } from "./storage.js";
import { COOLDOWN_MS, sendToWebhook, webhookConfigured } from "./api.js";
import { TYPES, waitText } from "./utils.js";

export default function App() {
  const [view, setView] = useState("new");
  const [requests, setRequests] = useState(loadRequests);
  const [toastMsg, setToastMsg] = useState("");
  const [canStore] = useState(storageAvailable);
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 3200);
  }, []);

  useEffect(() => onExternalChange(() => setRequests(loadRequests())), []);

  const submit = async (record) => {
    const id = record.createdAt.toString(36) + Math.random().toString(36).slice(2, 6);
    const full = { ...record, id, uid: LOCAL_UID };
    if (webhookConfigured) {
      const left = Math.min(COOLDOWN_MS, COOLDOWN_MS - (Date.now() - loadLastSent()));
      if (left > 0) {
        toast("Bạn vừa gửi đơn. Vui lòng thử lại sau " + waitText(left) + ".");
        return false;
      }
      try {
        await sendToWebhook(full);
      } catch (e) {
        toast(
          e.status === 429
            ? "Bạn gửi đơn quá nhanh. Vui lòng thử lại sau " + waitText((e.retryAfter || COOLDOWN_MS / 1000) * 1000) + "."
            : "Gửi chưa thành công. Thử lại sau ít phút."
        );
        return false;
      }
      saveLastSent(Date.now());
    }
    const next = [...loadRequests(), full];
    saveRequests(next);
    setRequests(next);
    toast("Đã gửi đơn " + TYPES[record.type].l.toLowerCase() + ". Đơn đang chờ duyệt.");
    setView("mine");
    return true;
  };

  const cancel = (r) => {
    const next = loadRequests().filter((x) => !(x.uid === r.uid && x.id === r.id));
    saveRequests(next);
    setRequests(next);
    toast("Đã huỷ đơn");
  };

  const pageTitle = view === "new" ? "Tạo đơn xin phép" : "Đơn của tôi";

  return (
    <>
      <Header view={view} onChange={setView} />
      <main className="wrap">
        <div id="status" className="notice warn" hidden={canStore}>
          Trình duyệt đang chặn lưu trữ cục bộ nên đơn sẽ không được lưu lại sau khi tải lại trang.
        </div>

        <div className="notice warn" hidden={webhookConfigured}>
          Chưa cấu hình VITE_WEBHOOK_URL nên đơn chỉ được lưu trên máy này, chưa gửi lên Google Sheet.
        </div>

        <div hidden={view !== "new"}>
          <RequestForm onSubmit={submit} onInvalid={() => toast("Vui lòng kiểm tra lại các ô đánh dấu đỏ")} />
        </div>
        <MyRequests hidden={view !== "mine"} items={requests.filter((r) => r.uid === LOCAL_UID)} onCancel={cancel} />
      </main>
      <div className="toast" id="toast" role="status" hidden={!toastMsg}>{toastMsg}</div>
    </>
  );
}
