# pcs-chamcong — Sổ Đơn Nghỉ & Ra Vào

Ứng dụng React (Vite) quản lý đơn xin nghỉ phép, đi muộn, về sớm và ra ngoài giữa giờ.
Chuyển đổi từ trang HTML "Sổ Đơn Nghỉ & Ra Vào", giữ nguyên giao diện và các thành phần:

- **Tạo đơn**: biểu mẫu theo từng loại đơn, tự tính tổng thời gian, kiểm tra dữ liệu.
- **Đơn của tôi**: danh sách đơn kèm trạng thái duyệt, huỷ đơn khi còn chờ duyệt.

## Chạy dự án

```bash
npm install
npm run dev
```

Build bản production: `npm run build` (kết quả trong `dist/`).

## Gửi đơn vào Google Sheet

Khi bấm **Gửi đơn**, app gửi POST tới webhook của n8n (đặt địa chỉ trong .env, xem .env.example), n8n ghi một dòng vào Google Sheet và báo lên Teams khi xin nghỉ trong ngày. Cách dựng workflow: [docs/n8n-google-sheets.md](docs/n8n-google-sheets.md).

Tab **Đơn của tôi** chỉ là bản lưu localStorage trên từng trình duyệt. Chưa đặt VITE_WEBHOOK_URL thì đơn chỉ lưu cục bộ.

## Cấu trúc

```
src/
  App.jsx                 trạng thái chung, chuyển tab, toast
  components/             Header, RequestForm, MyRequests
  utils.js                định dạng ngày giờ, tính số ngày/phút
  api.js                  gửi đơn tới webhook n8n
  storage.js              lưu trữ localStorage
  styles.css              CSS giữ nguyên từ bản gốc
```
