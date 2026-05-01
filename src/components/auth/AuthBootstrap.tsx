"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/store/hooks";
import { clearAuthUser, setAuthUser } from "@/features/auth";
import type { MeResponse, RefreshResponse } from "@/features/auth/types";
import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";
import { setAccessToken, getAccessToken } from "@/lib/auth/accessToken";
import { clearRouteSessionCookies } from "@/lib/auth/sessionCookies";

function hasQcAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith("qc_auth=1"));
}

export function AuthBootstrap() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!hasQcAuthCookie()) return;
    if (getAccessToken()) return;

    void (async () => {
      try {
        const { data } = await axios.post<RefreshResponse>(
          endpoints.auth.refresh,
          {},
          { withCredentials: true },
        );
        setAccessToken(data.access_token);
        const me = await axios.get<MeResponse>(endpoints.auth.me);
        dispatch(
          setAuthUser({
            id: String(me.data.id),
            email: me.data.email,
            full_name: me.data.full_name,
            role: me.data.role,
            avatar_url: me.data.avatar_url,
          }),
        );
      } catch {
        setAccessToken(null);
        dispatch(clearAuthUser());
        clearRouteSessionCookies();
        if (!window.location.pathname.startsWith("/login")) {
          router.replace("/login");
        }
      }
    })();
  }, [dispatch, router]);

  return null;
}
