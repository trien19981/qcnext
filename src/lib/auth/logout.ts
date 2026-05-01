import { clearAuthUser } from "@/features/auth/authSlice";
import { store } from "@/store/store";
import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";
import { setAccessToken } from "./accessToken";
import { clearRouteSessionCookies } from "./sessionCookies";

export async function performLogout(): Promise<void> {
  try {
    await axios.post(endpoints.auth.logout, {}, { withCredentials: true });
  } catch {
    /* API luôn cố revoke; lỗi mạng vẫn xoá phía client */
  }
  setAccessToken(null);
  store.dispatch(clearAuthUser());
  clearRouteSessionCookies();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
