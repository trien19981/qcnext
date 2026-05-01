"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchHealth } from "../store/slice";

export function HealthCheckCard() {
  const dispatch = useAppDispatch();
  const { status, data, error } = useAppSelector((s) => s.health);

  useEffect(() => {
    dispatch(fetchHealth());
  }, [dispatch]);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        API health (Axios + Redux)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {status === "loading" && "Đang gọi /api/health..."}
        {status === "failed" && `Lỗi: ${error}`}
        {status === "succeeded" &&
          `OK · ${data?.service} · ${new Date(data?.time ?? "").toLocaleString(
            "vi-VN",
          )}`}
        {status === "idle" && "Chưa gọi."}
      </p>
    </div>
  );
}

