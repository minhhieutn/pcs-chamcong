// Hiện tab "Quản lý" (duyệt đơn, sổ theo dõi). Đặt VITE_IS_ADMIN=false trong .env để ẩn.
export const IS_ADMIN = import.meta.env.VITE_IS_ADMIN !== "false";
