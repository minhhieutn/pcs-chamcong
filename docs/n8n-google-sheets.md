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
Chuyển chuỗi JSON (app gửi `text/plain` để trình duyệt không phải gửi preflight) thành đối tượng, thêm giờ gửi, và **kiểm tra chống spam**: mỗi người (họ tên + phòng ban) 1 đơn mỗi 5 phút, mỗi IP tối đa 10 đơn mỗi 5 phút. Muốn đổi thì sửa `WINDOW_MS` và `IP_MAX` ở đầu đoạn code. Kết quả là hai trường `blocked` và `retryAfter` (giây).

```js
const item = $input.first().json;
const body = item.body;
const d = typeof body === 'string' ? JSON.parse(body) : body;

// Chặn spam: mỗi người (họ tên + phòng ban) 1 đơn mỗi WINDOW_MS, mỗi IP tối đa IP_MAX đơn mỗi WINDOW_MS.
const WINDOW_MS = 5 * 60 * 1000;
const IP_MAX = 10;
const hdr = item.headers || {};
const ip = String(hdr['x-forwarded-for'] || hdr['x-real-ip'] || 'unknown').split(',')[0].trim();
const person = 'p:' + [d.hoten, d.phongban].map(s => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ')).join('|');
const ipKey = 'ip:' + ip;

const sd = $getWorkflowStaticData('global');
const now = Date.now();
const sent = {};
for (const [k, v] of Object.entries(sd.sent || {})) {
  const recent = v.filter(t => now - t < WINDOW_MS);
  if (recent.length) sent[k] = recent;
}
const personHits = sent[person] || [];
const ipHits = sent[ipKey] || [];
let wait = 0;
if (personHits.length >= 1) wait = Math.max(wait, WINDOW_MS - (now - personHits[0]));
if (ip !== 'unknown' && ipHits.length >= IP_MAX) wait = Math.max(wait, WINDOW_MS - (now - ipHits[0]));

d.blocked = wait > 0;
d.retryAfter = Math.ceil(wait / 1000);
if (!d.blocked) {
  sent[person] = [...personHits, now];
  if (ip !== 'unknown') sent[ipKey] = [...ipHits, now];
}
sd.sent = sent;
d.thoigiangui = $now.setZone('Asia/Ho_Chi_Minh').toFormat('dd/MM/yyyy HH:mm');
return [{ json: d }];
```

### Node 3 — IF (đặt tên `Cho phep`)
Một điều kiện kiểu **Boolean**: giá trị `{{ $json.blocked }}` là **false**.
- Nhánh **true** → node Google Sheets (Node 4).
- Nhánh **false** → node Respond to Webhook báo chặn (Node 3b).

### Node 3b — Respond to Webhook (đặt tên `Tu choi spam`)
- **Respond With**: `JSON`, **Response Body**: `{{ JSON.stringify({ ok: false, error: "rate_limited", retryAfter: $json.retryAfter }) }}`
- **Options → Response Code**: `429`
- **Options → Response Headers**: `Access-Control-Allow-Origin` = `*`

App đọc mã 429 và `retryAfter` để báo "Bạn gửi đơn quá nhanh. Vui lòng thử lại sau … phút."

### Node 4 — Google Sheets → Append Row
- **Credential**: đăng nhập tài khoản Google (Google Sheets OAuth2).
- **Document**: chọn file Sheet vừa tạo. **Sheet**: `DonNghi`.
- **Mapping Column Mode**: `Map Automatically` (tên khoá trùng tên cột nên khớp luôn; `homnay` và `thoigian` không có cột tương ứng nên bị bỏ qua).

### Node 5 — Respond to Webhook
- **Respond With**: `JSON`, **Response Body**: `{"ok": true}`
- **Options → Response Headers**: tên `Access-Control-Allow-Origin`, giá trị `*`

Đặt node này **sau** Google Sheets: nếu ghi Sheet lỗi thì app nhận lỗi và báo "Gửi chưa thành công". Thiếu header trên thì trình duyệt chặn, app báo lỗi dù đơn đã vào Sheet.

### Node 6 — IF (xin nghỉ trong ngày)
Một điều kiện kiểu **Boolean** với biểu thức:

```
{{ $('Chuan hoa').item.json.loaidon === 'Nghỉ phép'
   ? ($('Chuan hoa').item.json.tungay <= $('Chuan hoa').item.json.homnay && $('Chuan hoa').item.json.denngay >= $('Chuan hoa').item.json.homnay)
   : $('Chuan hoa').item.json.ngay === $('Chuan hoa').item.json.homnay }}
```

Đơn "trong ngày" là đơn có thời gian nghỉ rơi vào đúng hôm nay. Nhánh **true** nối sang node báo Teams.

### Node 7 — Báo lên Teams (nhánh true của IF)
Chọn một trong hai cách:

- **Workflows webhook của kênh Teams** (không cần quản trị Azure): trong kênh Teams → `…` → **Workflows** → mẫu *Post to a channel when a webhook request is received* → copy URL. Trong n8n dùng node **HTTP Request**, method `POST`, URL vừa copy, body JSON theo mẫu mà Workflows hiển thị (mẫu thường là một Adaptive Card; đặt nội dung chữ bên dưới vào phần text).
- **Node Microsoft Teams** của n8n (Chat Message / Channel Message → Create): cần quản trị viên tạo ứng dụng Entra ID và cấp quyền cho n8n.

Với node **HTTP Request**: method `POST`, URL của Workflows, **Body Content Type** `JSON`, **Specify Body** `Using JSON`, đặt ô JSON ở chế độ **Expression** và dán đoạn dưới. Dùng `JSON.stringify` để dấu nháy kép hoặc xuống dòng trong lý do nghỉ không làm hỏng JSON (chèn `{{ }}` trực tiếp vào chuỗi JSON sẽ báo lỗi `JSON parameter needs to be valid JSON`):

```
{{ JSON.stringify({
  type: "message",
  attachments: [{
    contentType: "application/vnd.microsoft.card.adaptive",
    content: {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.4",
      body: [{
        type: "TextBlock",
        wrap: true,
        text: "🔔 " + $('Chuan hoa').item.json.hoten + " (" + $('Chuan hoa').item.json.phongban + ") xin " + $('Chuan hoa').item.json.loaidon + " — " + $('Chuan hoa').item.json.thoigian + ". Lý do: " + $('Chuan hoa').item.json.lydo
      }]
    }
  }]
}) }}
```

Nhánh **false** của node IF để trống: đơn không rơi vào hôm nay thì chỉ ghi Sheet, không báo.

## 3. Bật workflow và nối với app

1. Bật công tắc **Active** của workflow. Nếu chưa bật, chỉ **Test URL** hoạt động và chỉ khi node Webhook đang ở chế độ "Listen for test event".
2. Mở node Webhook, copy **Production URL**.
3. Tạo file `.env` ở thư mục dự án (theo mẫu `.env.example`):

```
VITE_WEBHOOK_URL=<Production URL>
```

4. Chạy lại `npm run dev`, gửi thử một đơn, rồi kiểm tra dòng mới trong Sheet và mục **Executions** của n8n.

Địa chỉ n8n phải truy cập được từ trình duyệt của người dùng. Nếu n8n chạy trên `localhost` thì chỉ máy đó gửi được. Khi triển khai app lên mạng, n8n cần có địa chỉ HTTPS công khai hoặc trong mạng nội bộ công ty.

## Chống spam

- **Trong app:** sau khi gửi thành công, trình duyệt đó bị khoá gửi 5 phút (`COOLDOWN_MS` trong `src/api.js`). Chỉ chặn bấm nhầm và spam đơn giản vì có thể bị qua mặt.
- **Trong n8n:** Node 2 và 3 ở trên chặn thật, theo người và theo IP. Lưu bằng bộ nhớ tĩnh của workflow (`$getWorkflowStaticData`) nên:
  - Chỉ hoạt động ở lần chạy production, không hoạt động khi bấm **Execute workflow** thử.
  - Bộ nhớ này không chia sẻ giữa nhiều worker và nhiều request gửi cùng lúc có thể lọt qua. Muốn chặn chắc hơn thì nhờ IT đặt rate limit ở nginx/Cloudflare cho `/webhook/don-nghi`.
  - Cả văn phòng thường dùng chung một IP, vì vậy giới hạn IP đặt lỏng (10 đơn); giới hạn chặt là theo người.
  - Nếu bước ghi Sheet lỗi sau khi đã qua kiểm tra, người đó vẫn phải chờ hết 5 phút.

## Lưu ý bảo mật

`VITE_WEBHOOK_URL` bị nhúng vào mã trình duyệt, nên ai mở trang đều thấy URL và có thể gửi đơn giả vào Sheet. Chấp nhận được khi app chỉ dùng trong mạng nội bộ hoặc chỉ chia sẻ cho nhân viên công ty. Nếu cần chặt hơn, đặt app và n8n sau VPN hoặc thêm bước kiểm tra trong workflow.
