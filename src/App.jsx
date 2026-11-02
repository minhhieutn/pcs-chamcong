import { useCallback, useEffect, useRef, useState } from "react";
import Header from "./components/Header.jsx";
import RequestForm from "./components/RequestForm.jsx";
import MyRequests from "./components/MyRequests.jsx";
import { LOCAL_UID, loadRequests, onExternalChange, saveRequests, storageAvailable } from "./storage.js";
import { TYPES } from "./utils.js";

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

  return (
    <>
      <Header view={view} onChange={setView} />
      <main className="wrap">
        <div id="status" className="notice warn" hidden={canStore}>
          Trình duyệt đang chặn lưu trữ cục bộ nên đơn sẽ không được lưu lại sau khi tải lại trang.
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
