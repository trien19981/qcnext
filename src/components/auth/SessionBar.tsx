"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { performLogout } from "@/lib/auth/logout";

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const hit = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  if (!hit) return null;
  return decodeURIComponent(hit.slice(name.length + 1));
}

export function SessionBar() {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);
  const [busy, setBusy] = useState(false);
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const email = useMemo(() => user?.email ?? readCookie("qc_email") ?? "", [user]);

  if (!isClient) return null;
  if (pathname === "/login") return null;
  if (!user && !readCookie("qc_auth")) return null;

  return (
    <div className="fixed right-3 top-3 z-50 flex items-center gap-2 rounded-lg border border-zinc-200/90 bg-white/90 px-3 py-1.5 text-xs shadow-sm backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90">
      <span className="max-w-[200px] truncate font-medium text-zinc-700 dark:text-zinc-200" title={email}>
        {email || "…"}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void performLogout();
        }}
        className="rounded-md border border-zinc-200 bg-white px-2 py-1 font-semibold text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
      >
        Đăng xuất
      </button>
    </div>
  );
}
