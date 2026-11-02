# Dựng flow Power Automate

Luồng: App React → **HTTP POST** → Flow → ghi vào SharePoint List → (nếu xin nghỉ trong ngày) báo lên Teams.

## 1. Tạo flow

make.powerautomate.com → **Tạo** → **Luồng đám mây tức thời** → bỏ qua chọn trigger → đặt tên `Nhận đơn nghỉ`.

### Bước 1 — Trigger: When an HTTP request is received
- **Who can trigger the flow?**: Anyone
- **Request Body JSON Schema**: dán schema ở mục 3 bên dưới.
- Lưu flow để có **HTTP POST URL**, dán vào file `.env` của dự án:

```
VITE_FLOW_URL=<HTTP POST URL>
```

### Bước 2 — SharePoint: Create item
- **Site Address** và **List Name**: chọn site và List `DonNghi`.
- Gán từng cột từ **Dynamic content** của trigger (`hoten` → Title, `chucvu`, `phongban`, `loaidon`, …).
- Với cột ngày và số có thể rỗng (`tungay`, `denngay`, `ngay`, `songay`, `sophut`), nhập biểu thức để tránh lỗi:
  `if(empty(triggerBody()?['tungay']), null, triggerBody()?['tungay'])`
- Cột `trangthai`: chọn giá trị `Cho duyet`.
- Cột kiểu **Lựa chọn** (`loaidon`, `trangthai`, …) phải có đúng giá trị mà app gửi, nếu không bước này lỗi. Giá trị `loaidon` app gửi: `Nghỉ phép`, `Đi muộn`, `Về sớm`, `Ra ngoài giữa giờ`. Nếu không muốn lo chuyện này, để các cột đó là **Một dòng văn bản**.

### Bước 3 — Response
Thêm **Response** (kết nối Premium) đặt **sau Create item**:
- **Status Code**: `200`
- **Headers**: `Access-Control-Allow-Origin` = `*`
- **Body**: `{"ok":true}`

Thiếu header này thì trình duyệt chặn không cho app đọc kết quả, nên app sẽ báo "Gửi chưa thành công" dù đơn đã vào List.

### Bước 4 — Báo lên Teams khi xin nghỉ trong ngày
Thêm **Condition** sau Response (hoặc song song). Đơn "trong ngày" là đơn có thời gian nghỉ rơi vào đúng hôm nay:

- Điều kiện **Hoặc**:
  - `loaidon` bằng `Nghỉ phép` **và** `tungay` nhỏ hơn hoặc bằng `homnay` **và** `denngay` lớn hơn hoặc bằng `homnay`
  - `loaidon` khác `Nghỉ phép` **và** `ngay` bằng `homnay`

Nhánh **Nếu có** thêm **Microsoft Teams → Post message in a chat or channel**:
- **Post as**: Flow bot, **Post in**: Channel, chọn team và kênh.
- Nội dung ví dụ:
  `🔔 **@{triggerBody()?['hoten']}** (@{triggerBody()?['phongban']}) xin **@{triggerBody()?['loaidon']}** — @{triggerBody()?['thoigian']}. Lý do: @{triggerBody()?['lydo']}`

## 2. Thử

Chạy `npm run dev` với `.env` đã có `VITE_FLOW_URL`, gửi một đơn trên app, rồi mở **Run history** của flow để xem kết quả, và kiểm tra dòng mới trong List.

## 3. JSON Schema cho trigger

```json
{
  "type": "object",
  "properties": {
    "madon": { "type": "string" },
    "hoten": { "type": "string" },
    "chucvu": { "type": "string" },
    "phongban": { "type": "string" },
    "loaidon": { "type": "string" },
    "hinhthucnghi": { "type": "string" },
    "tungay": { "type": ["string", "null"] },
    "denngay": { "type": ["string", "null"] },
    "buoibatdau": { "type": "string" },
    "buoiketthuc": { "type": "string" },
    "songay": { "type": ["number", "null"] },
    "ngay": { "type": ["string", "null"] },
    "tugio": { "type": "string" },
    "dengio": { "type": "string" },
    "sophut": { "type": ["number", "null"] },
    "lydo": { "type": "string" },
    "nguoibangiao": { "type": "string" },
    "sdt": { "type": "string" },
    "trangthai": { "type": "string" },
    "homnay": { "type": "string" },
    "thoigian": { "type": "string" }
  }
}
```

## Lưu ý bảo mật

`VITE_FLOW_URL` bị nhúng vào mã trình duyệt, nên ai mở trang đều thấy URL và có thể gửi đơn giả vào flow. Chấp nhận được khi app chỉ dùng trong mạng nội bộ hoặc trên site giới hạn người truy cập. Nếu cần chặt hơn, chuyển sang đăng nhập bằng tài khoản công ty (MSAL).
