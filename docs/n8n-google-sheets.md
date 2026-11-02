# Gửi đơn vào Google Sheet bằng n8n

Luồng: App React → **POST** → n8n Webhook → ghi một dòng vào Google Sheet → trả `{"ok":true}` cho app → (nếu xin nghỉ trong ngày) báo lên Teams.

## 1. Chuẩn bị Google Sheet

Tạo một Google Sheet, đặt tên sheet (tab) là `DonNghi`. Dán dòng sau vào ô **A1** (các cột phân tách bằng Tab, dán một lần là tự chia cột):

```
madon	hoten	chucvu	phongban	loaidon	hinhthucnghi	tungay	denngay	buoibatdau	buoiketthuc	songay	ngay	tugio	dengio	sophut	lydo	nguoibangiao	sdt	trangthai	thoigiangui
```

Chọn hai cột `madon` và `sdt` → **Định dạng** → **Số** → **Văn bản thuần túy**, để số điện thoại không bị mất số 0 đầu.

Giá trị app gửi:
- `loaidon`: `Nghỉ phép`, `Đi muộn`, `Về sớm`, `Ra ngoài giữa giờ`
- `buoibatdau`, `buoiketthuc`: `am` hoặc `pm`
- `trangthai`: luôn là `Cho duyet` (cập nhật tay trong Sheet khi duyệt)
- `tungay`, `denngay`, `ngay` dạng `YYYY-MM-DD`; trường không áp dụng cho loại đơn đó thì để trống

## 2. Dựng workflow trong n8n

Tạo workflow mới tên `Nhận đơn nghỉ`, thêm lần lượt các node:

### Node 1 — Webhook
- **HTTP Method**: `POST`
- **Path**: `don-nghi`
- **Respond**: `Using 'Respond to Webhook' Node`
- **Options → Allowed Origins (CORS)**: `*`

### Node 2 — Code (đặt tên `Chuan hoa`)
App gửi nội dung JSON dạng `text/plain` để trình duyệt không phải gửi preflight, nên node này chuyển chuỗi thành đối tượng và thêm giờ gửi:

```js
const body = $input.first().json.body;
const d = typeof body === 'string' ? JSON.parse(body) : body;
d.thoigiangui = $now.setZone('Asia/Ho_Chi_Minh').toFormat('dd/MM/yyyy HH:mm');
return [{ json: d }];
```

### Node 3 — Google Sheets → Append Row
- **Credential**: đăng nhập tài khoản Google (Google Sheets OAuth2).
- **Document**: chọn file Sheet vừa tạo. **Sheet**: `DonNghi`.
- **Mapping Column Mode**: `Map Automatically` (tên khoá trùng tên cột nên khớp luôn; `homnay` và `thoigian` không có cột tương ứng nên bị bỏ qua).

### Node 4 — Respond to Webhook
- **Respond With**: `JSON`, **Response Body**: `{"ok": true}`
- **Options → Response Headers**: tên `Access-Control-Allow-Origin`, giá trị `*`

Đặt node này **sau** Google Sheets: nếu ghi Sheet lỗi thì app nhận lỗi và báo "Gửi chưa thành công". Thiếu header trên thì trình duyệt chặn, app báo lỗi dù đơn đã vào Sheet.

### Node 5 — IF (xin nghỉ trong ngày)
Một điều kiện kiểu **Boolean** với biểu thức:

```
{{ $('Chuan hoa').item.json.loaidon === 'Nghỉ phép'
   ? ($('Chuan hoa').item.json.tungay <= $('Chuan hoa').item.json.homnay && $('Chuan hoa').item.json.denngay >= $('Chuan hoa').item.json.homnay)
   : $('Chuan hoa').item.json.ngay === $('Chuan hoa').item.json.homnay }}
```

Đơn "trong ngày" là đơn có thời gian nghỉ rơi vào đúng hôm nay. Nhánh **true** nối sang node báo Teams.

### Node 6 — Báo lên Teams (nhánh true của IF)
Chọn một trong hai cách:

- **Workflows webhook của kênh Teams** (không cần quản trị Azure): trong kênh Teams → `…` → **Workflows** → mẫu *Post to a channel when a webhook request is received* → copy URL. Trong n8n dùng node **HTTP Request**, method `POST`, URL vừa copy, body JSON theo mẫu mà Workflows hiển thị (mẫu thường là một Adaptive Card; đặt nội dung chữ bên dưới vào phần text).
- **Node Microsoft Teams** của n8n (Chat Message / Channel Message → Create): cần quản trị viên tạo ứng dụng Entra ID và cấp quyền cho n8n.

Nội dung tin nhắn gợi ý:

```
🔔 {{ $('Chuan hoa').item.json.hoten }} ({{ $('Chuan hoa').item.json.phongban }}) xin {{ $('Chuan hoa').item.json.loaidon }} — {{ $('Chuan hoa').item.json.thoigian }}. Lý do: {{ $('Chuan hoa').item.json.lydo }}
```

## 3. Bật workflow và nối với app

1. Bật công tắc **Active** của workflow. Nếu chưa bật, chỉ **Test URL** hoạt động và chỉ khi node Webhook đang ở chế độ "Listen for test event".
2. Mở node Webhook, copy **Production URL**.
3. Tạo file `.env` ở thư mục dự án (theo mẫu `.env.example`):

```
VITE_WEBHOOK_URL=<Production URL>
```

4. Chạy lại `npm run dev`, gửi thử một đơn, rồi kiểm tra dòng mới trong Sheet và mục **Executions** của n8n.

Địa chỉ n8n phải truy cập được từ trình duyệt của người dùng. Nếu n8n chạy trên `localhost` thì chỉ máy đó gửi được. Khi triển khai app lên mạng, n8n cần có địa chỉ HTTPS công khai hoặc trong mạng nội bộ công ty.

## Lưu ý bảo mật

`VITE_WEBHOOK_URL` bị nhúng vào mã trình duyệt, nên ai mở trang đều thấy URL và có thể gửi đơn giả vào Sheet. Chấp nhận được khi app chỉ dùng trong mạng nội bộ hoặc chỉ chia sẻ cho nhân viên công ty. Nếu cần chặt hơn, đặt app và n8n sau VPN hoặc thêm bước kiểm tra trong workflow.
