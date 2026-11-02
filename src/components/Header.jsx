export default function Header({ view, onChange }) {
  const tab = (id, label) => (
    <button id={"tab-" + id} role="tab" aria-selected={view === id} onClick={() => onChange(id)}>
      {label}
    </button>
  );

  return (
    <header className="top">
      <div className="wrap">
        <div className="brand">
          <h1>Sổ Đơn Nghỉ &amp; Ra Vào</h1>
          <small>Nghỉ phép · Đi muộn · Về sớm · Ra ngoài giữa giờ</small>
        </div>
        <nav className="tabs" role="tablist">
          {tab("new", "Tạo đơn")}
          {tab("mine", "Đơn của tôi")}
        </nav>
      </div>
    </header>
  );
}
