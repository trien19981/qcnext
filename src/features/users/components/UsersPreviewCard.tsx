"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUsers } from "../store/slice";

export function UsersPreviewCard() {
  const dispatch = useAppDispatch();
  const { status, data, error } = useAppSelector((s) => s.users);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Users (feature scaffold)
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {status === "idle" && "Chưa gọi."}
        {status === "loading" && "Đang gọi /api/users..."}
        {status === "failed" && `Lỗi: ${error}`}
        {status === "succeeded" &&
          `Tổng: ${data?.total ?? 0} · Hiển thị: ${data?.items.length ?? 0}`}
      </p>
      <div className="mt-3 space-y-1">
        {(data?.items ?? []).slice(0, 3).map((u) => (
          <div
            key={u.id}
            className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm dark:bg-zinc-950/40"
          >
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {u.name}
            </span>
            <span className="text-zinc-600 dark:text-zinc-400">{u.email}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-500">
        (API này là khung mẫu; nếu bạn chưa tạo backend route thì sẽ báo lỗi 404.)
      </p>
    </div>
  );
}

