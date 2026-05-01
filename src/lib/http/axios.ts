import Axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import type { RefreshResponse } from "@/features/auth/types";
import { getAccessToken, setAccessToken } from "@/lib/auth/accessToken";
import { clearRouteSessionCookies } from "@/lib/auth/sessionCookies";
import { endpoints } from "./endpoints";

const base =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_BASE_URL
    ? process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")
    : "";

export const axios = Axios.create({
  baseURL: base,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30_000,
  withCredentials: true,
});

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean };

axios.interceptors.request.use((config) => {
  const url = config.url ?? "";
  const skipBearer = url.includes("/auth/login") || url.includes("/auth/refresh");
  if (!skipBearer) {
    const t = getAccessToken();
    if (t) {
      config.headers = AxiosHeaders.from(config.headers ?? {});
      config.headers.set("Authorization", `Bearer ${t}`);
    }
  }
  return config;
});

axios.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined;
    const status = error.response?.status;
    if (status !== 401 || !original) return Promise.reject(error);
    if (original._retry) return Promise.reject(error);

    const u = original.url ?? "";
    if (u.includes("/auth/refresh") || u.includes("/auth/login")) {
      return Promise.reject(error);
    }

    original._retry = true;
    try {
      const { data } = await axios.post<RefreshResponse>(
        endpoints.auth.refresh,
        {},
        { withCredentials: true },
      );
      setAccessToken(data.access_token);
      original.headers = AxiosHeaders.from(original.headers ?? {});
      original.headers.set("Authorization", `Bearer ${data.access_token}`);
      return axios(original);
    } catch {
      setAccessToken(null);
      clearRouteSessionCookies();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
        window.location.href = `/login?next=${next}`;
      }
      return Promise.reject(error);
    }
  },
);
