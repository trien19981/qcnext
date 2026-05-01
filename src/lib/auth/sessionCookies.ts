/**
 * Cookie gợi ý đăng nhập cho middleware (Next không đọc được memory token).
 * Không thay thế refresh_token httpOnly từ API.
 */

function setCookie(name: string, value: string, days = 7): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export function setRouteSessionCookies(email: string, role: string): void {
  setCookie("qc_auth", "1");
  setCookie("qc_role", role);
  setCookie("qc_email", email);
}

export function clearRouteSessionCookies(): void {
  deleteCookie("qc_auth");
  deleteCookie("qc_role");
  deleteCookie("qc_email");
}
