// Lớp lưu trữ cục bộ (localStorage). Bản gốc lưu trên claude.ai (claude.use("db"));
// khi cần backend thật, chỉ cần thay các hàm trong file này.
const K_REQ = "pcs-chamcong:requests";
const K_PROFILE = "pcs-chamcong:profile";

export const LOCAL_UID = "local";

export function lsGet(k) {
  try {
    return JSON.parse(localStorage.getItem(k) || "null");
  } catch (e) {
    return null;
  }
}
export function lsSet(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
    return true;
  } catch (e) {
    return false;
  }
}

export const storageAvailable = () => {
  try {
    localStorage.setItem("pcs-chamcong:probe", "1");
    localStorage.removeItem("pcs-chamcong:probe");
    return true;
  } catch (e) {
    return false;
  }
};

export const loadRequests = () => lsGet(K_REQ) || [];
export const saveRequests = (list) => lsSet(K_REQ, list);
export const loadProfile = () => lsGet(K_PROFILE);
export const saveProfile = (p) => lsSet(K_PROFILE, p);

// Đồng bộ giữa các tab trình duyệt.
export function onExternalChange(cb) {
  const h = (e) => {
    if (e.key === K_REQ) cb();
  };
  window.addEventListener("storage", h);
  return () => window.removeEventListener("storage", h);
}
