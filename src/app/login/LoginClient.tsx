"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import { site } from "@/lib/site";
import { useAppDispatch } from "@/store/hooks";
import { setAuthUser } from "@/features/auth";
import type { ApiErrorBody, LoginResponse } from "@/features/auth/types";
import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";
import { setAccessToken } from "@/lib/auth/accessToken";
import { setRouteSessionCookies } from "@/lib/auth/sessionCookies";

const EMAIL_RE = /^[^@]+@[^@]+\.[^@]+$/;

function TextField({
  label,
  type,
  value,
  onChange,
  placeholder,
  error,
  right,
  disabled,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: boolean;
  right?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{label}</span>
      <div className="relative mt-1">
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={[
            "w-full rounded-lg border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-950/30 dark:text-zinc-50",
            right ? "pr-10" : "",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200/60 dark:border-red-900/70 dark:focus:ring-red-900/30"
              : "border-zinc-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:focus:ring-violet-900/30",
          ].join(" ")}
        />
        {right ? (
          <div className="absolute inset-y-0 right-0 flex items-center pr-2">{right}</div>
        ) : null}
      </div>
    </label>
  );
}

export function LoginClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [lockedError, setLockedError] = useState<string | null>(null);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [successFlash, setSuccessFlash] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.length > 0 && !submitting;
  }, [email, password, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setFormError(null);
    setLockedError(null);
    setRateLimitError(null);

    const em = email.trim();
    if (!em) {
      setEmailError("Vui lòng nhập email");
      return;
    }
    if (!EMAIL_RE.test(em)) {
      setEmailError("Email không đúng định dạng");
      return;
    }
    if (!password) {
      setPasswordError("Vui lòng nhập mật khẩu");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await axios.post<LoginResponse>(
        endpoints.auth.login,
        { email: em, password },
        { withCredentials: true },
      );
      setAccessToken(data.access_token);
      dispatch(
        setAuthUser({
          id: String(data.user.id),
          email: data.user.email,
          full_name: data.user.full_name,
          role: data.user.role,
          avatar_url: data.user.avatar_url,
        }),
      );
      setRouteSessionCookies(data.user.email, data.user.role);
      setSuccessFlash(true);
      await new Promise((r) => setTimeout(r, 800));
      router.replace(nextPath || "/projects");
    } catch (err) {
      const ax = err as AxiosError<ApiErrorBody>;
      const status = ax.response?.status;
      const body = ax.response?.data;
      const msg =
        typeof body?.message === "string"
          ? body.message
          : (ax.response?.data as { detail?: string } | undefined)?.detail?.toString?.() ??
            "Đăng nhập thất bại";

      if (status === 429) {
        const ra = ax.response?.headers?.["retry-after"];
        const sec = ra ? parseInt(ra, 10) : NaN;
        setRateLimitError(
          Number.isFinite(sec)
            ? `Quá nhiều lần thử. Vui lòng thử lại sau ${sec} giây.`
            : "Quá nhiều lần thử. Vui lòng thử lại sau.",
        );
      } else if (status === 403) {
        setLockedError(msg || "Tài khoản đã bị khoá. Liên hệ Admin.");
      } else if (status === 422) {
        setEmailError(msg || "Email không đúng định dạng");
      } else if (status === 401) {
        setFormError(msg || "Email hoặc mật khẩu không đúng");
      } else {
        setFormError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-zinc-100 px-6 py-16 dark:bg-zinc-950">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.22),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.14),transparent)]"
      />

      <main className="relative w-full max-w-[400px]">
        <div className="rounded-xl border border-zinc-200/80 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-[10px] font-black tracking-tight text-white">
              QC
            </div>
            <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">{site.name}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Đăng nhập để tiếp tục</p>
          </div>

          {lockedError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {lockedError}
            </p>
          ) : null}
          {rateLimitError ? (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {rateLimitError}
            </p>
          ) : null}
          {successFlash ? (
            <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
              Đăng nhập thành công…
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <TextField
              label="Email"
              type="email"
              value={email}
              disabled={submitting}
              onChange={setEmail}
              placeholder="email@company.com"
              error={!!emailError}
            />
            {emailError ? <p className="text-xs font-medium text-red-600 dark:text-red-400">{emailError}</p> : null}

            <TextField
              label="Mật khẩu"
              type={showPw ? "text" : "password"}
              value={password}
              disabled={submitting}
              onChange={setPassword}
              error={!!passwordError || !!formError}
              right={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
                  aria-label={showPw ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPw ? "Ẩn" : "Hiện"}
                </button>
              }
            />
            {passwordError ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{passwordError}</p>
            ) : null}

            <div className="flex justify-end">
              <Link
                href="#"
                className="text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-400"
                onClick={(ev) => ev.preventDefault()}
              >
                Quên mật khẩu?
              </Link>
            </div>

            {formError ? (
              <p className="text-xs font-medium text-red-600 dark:text-red-400">{formError}</p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                canSubmit
                  ? "bg-violet-600 hover:bg-violet-500 active:bg-violet-700"
                  : "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
              ].join(" ")}
            >
              {submitting ? "Đang đăng nhập…" : "Đăng nhập"}
            </button>

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              API: <span className="font-mono">POST /api/v1/auth/login</span>
              {process.env.NEXT_PUBLIC_API_BASE_URL
                ? " (trực tiếp backend)"
                : " (qua Next rewrite — cần FastAPI chạy theo API_UPSTREAM_URL)"}
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
