# pcs-chamcong — Sổ Đơn Nghỉ & Ra Vào

Ứng dụng React (Vite) quản lý đơn xin nghỉ phép, đi muộn, về sớm và ra ngoài giữa giờ.
Chuyển đổi từ trang HTML "Sổ Đơn Nghỉ & Ra Vào", giữ nguyên giao diện và các thành phần:

- **Tạo đơn**: biểu mẫu theo từng loại đơn, tự tính tổng thời gian, kiểm tra dữ liệu.
- **Đơn của tôi**: danh sách đơn kèm trạng thái duyệt, huỷ đơn khi còn chờ duyệt.
- **Quản lý**: KPI, bộ lọc (tháng, loại, trạng thái, phòng ban, tên), duyệt/từ chối kèm ghi chú, xuất CSV.

## Chạy dự án

```bash
npm install
npm run dev
```

Build bản production: `npm run build` (kết quả trong `dist/`).

## Lưu trữ dữ liệu

Bản HTML gốc lưu đơn trên claude.ai (`claude.use("db")`). Bản React này lưu bằng `localStorage`
của trình duyệt (`src/storage.js`), nên dữ liệu chỉ nằm trên từng máy. Muốn dùng chung nhiều người
cần thay các hàm trong `src/storage.js` bằng backend thật.

Tab **Quản lý** hiện mặc định. Đặt `VITE_IS_ADMIN=false` trong `.env` (xem `.env.example`) để ẩn.

## Cấu trúc

```
src/
  App.jsx                 trạng thái chung, chuyển tab, toast
  components/             Header, RequestForm, MyRequests, AdminView
  utils.js                định dạng ngày giờ, tính số ngày/phút, xuất CSV
  storage.js              lưu trữ localStorage
  styles.css              CSS giữ nguyên từ bản gốc
```
