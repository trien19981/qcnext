"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useState } from "react";
import type { AxiosError } from "axios";
import {
  archiveProject,
  createProject,
  fetchProjectList,
  patchProject,
  generateSlug,
  isValidSlug,
  type ApiErrorBody,
  type ProjectCreateBody,
  type ProjectListItem,
} from "@/features/projects";
import { useAppSelector } from "@/store/hooks";

type StatusFilter = "active" | "archived" | "all";

function formatUpdated(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 864e5;
  if (diff < 1) return "Hôm nay";
  if (diff < 2) return "1 ngày trước";
  if (diff < 8) return `${Math.floor(diff)} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

function roleBadgeClass(role: string): string {
  const r = role.toLowerCase();
  if (r === "admin" || r === "owner") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200";
  if (r === "pm") return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-200";
  if (r === "qc") return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (r === "dev") return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
}

function errMessage(e: unknown): string {
  const ax = e as AxiosError<ApiErrorBody>;
  const m = ax.response?.data?.message;
  return typeof m === "string" ? m : "Đã có lỗi xảy ra";
}

export function ProjectsClient() {
  const user = useAppSelector((s) => s.auth.user);
  const isAdmin = (user?.role ?? "").toLowerCase() === "admin";

  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [debSearch, setDebSearch] = useState("");
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 50, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProjectListItem | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const canShowArchivedTab = isAdmin;
  const statusForQuery: StatusFilter =
    !canShowArchivedTab && status === "archived" ? "active" : status;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProjectList({
        status: statusForQuery,
        search: debSearch || undefined,
        page,
        per_page: 50,
      });
      setItems(res.data);
      setPagination(res.pagination);
    } catch (e) {
      setError(errMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusForQuery, debSearch, page]);

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, [load]);

  const statusOptions: StatusFilter[] = canShowArchivedTab ? ["active", "archived", "all"] : ["active", "all"];

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Projects</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Dự án bạn có quyền truy cập. Mở tài liệu theo từng project.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-500"
            >
              + Tạo project
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            setPage(1);
          }}
          placeholder="Tìm kiếm project…"
          className="w-full max-w-md rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:ring-violet-900/40 sm:flex-1"
        />
        <div className="inline-flex shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/60">
            {statusOptions.map((s) => {
            const selected = status === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                aria-pressed={selected}
                className={[
                  "px-3 py-2 text-xs font-semibold capitalize transition",
                  selected
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50",
                ].join(" ")}
              >
                {s === "all" ? "Tất cả" : s}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-2 text-xs font-semibold underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 animate-pulse rounded-2xl border border-zinc-200/80 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/50"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 px-6 py-16 text-center dark:border-zinc-700 dark:bg-zinc-900/30">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {debSearch.trim()
              ? `Không tìm thấy project với từ khóa “${debSearch.trim()}”.`
              : "Chưa có project nào."}
          </p>
          {debSearch.trim() ? (
            <button
              type="button"
              className="mt-3 text-xs font-semibold text-violet-600 underline dark:text-violet-400"
              onClick={() => {
                setSearchInput("");
                setPage(1);
              }}
            >
              Xoá tìm kiếm
            </button>
          ) : isAdmin ? (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Tạo project đầu tiên
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <article
                key={p.id}
                className="group relative flex flex-col rounded-2xl border border-zinc-200/90 bg-white/90 p-4 shadow-sm transition hover:border-violet-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-violet-800"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={[
                      "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      p.status === "active"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200"
                        : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                    ].join(" ")}
                  >
                    {p.status === "active" ? "Active" : "Archived"}
                  </span>
                  {isAdmin ? (
                    <details className="relative z-10 text-right">
                      <summary className="cursor-pointer list-none rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 [&::-webkit-details-marker]:hidden">
                        ···
                      </summary>
                      <div className="absolute right-0 mt-1 min-w-[140px] rounded-lg border border-zinc-200 bg-white py-1 text-left text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800"
                          onClick={() => setEditItem(p)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left font-medium text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/40"
                          onClick={async () => {
                            const next = p.status === "active" ? "archived" : "active";
                            const label = next === "archived" ? "archive" : "kích hoạt lại";
                            if (!window.confirm(`Bạn có chắc muốn ${label} project này?`)) return;
                            try {
                              await archiveProject(p.id, next);
                              await load();
                            } catch (e) {
                              alert(errMessage(e));
                            }
                          }}
                        >
                          {p.status === "active" ? "Archive" : "Unarchive"}
                        </button>
                      </div>
                    </details>
                  ) : null}
                </div>

                <Link
                  href={`/documents?projectId=${encodeURIComponent(p.id)}`}
                  className="mt-3 flex flex-1 flex-col outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                >
                  <h2 className="line-clamp-1 text-[15px] font-semibold text-zinc-900 dark:text-zinc-50">
                    {p.name}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-zinc-500 dark:text-zinc-400">
                    {p.description || "Không có mô tả."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      📄 {p.stats.document_count} docs
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      ✓ {p.stats.testcase_count} TC
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <span>Cập nhật: {formatUpdated(p.updated_at)}</span>
                    <span className="font-semibold text-violet-600 dark:text-violet-400">Tài liệu →</span>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-3 dark:border-zinc-800">
                  <span className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">{p.slug}</span>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${roleBadgeClass(p.my_role)}`}>
                    {p.my_role}
                  </span>
                </div>
              </article>
            ))}
          </div>

          {pagination.total_pages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-200 px-3 py-1 font-semibold disabled:opacity-40 dark:border-zinc-700"
              >
                Trước
              </button>
              <span className="text-zinc-600 dark:text-zinc-400">
                Trang {pagination.page} / {pagination.total_pages}
              </span>
              <button
                type="button"
                disabled={page >= pagination.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-200 px-3 py-1 font-semibold disabled:opacity-40 dark:border-zinc-700"
              >
                Sau
              </button>
            </div>
          ) : null}
        </>
      )}

      {createOpen ? (
        <CreateProjectModal
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            setPage(1);
            await load();
          }}
        />
      ) : null}

      {editItem ? (
        <EditProjectModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSaved={async () => {
            setEditItem(null);
            await load();
          }}
        />
      ) : null}
    </main>
  );
}

function CreateProjectModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slugErr, setSlugErr] = useState<string | null>(null);

  const slugDisplay = slugManual ? slug : generateSlug(name);

  async function submit() {
    setErr(null);
    setSlugErr(null);
    const n = name.trim();
    if (n.length < 3 || n.length > 100) {
      setErr("Tên project phải từ 3 đến 100 ký tự");
      return;
    }
    const s = (slugManual ? slug : generateSlug(name)).trim().toLowerCase();
    if (!isValidSlug(s)) {
      setSlugErr("Slug chỉ được chứa chữ thường, số và dấu gạch ngang");
      return;
    }
    if (description.length > 500) {
      setErr("Mô tả tối đa 500 ký tự");
      return;
    }
    const body: ProjectCreateBody = { name: n, slug: s, description: description.trim() || null };
    setSubmitting(true);
    try {
      await createProject(body);
      await onCreated();
    } catch (e) {
      const ax = e as AxiosError<ApiErrorBody>;
      if (ax.response?.status === 409) {
        setSlugErr(ax.response.data?.message ?? "Slug đã tồn tại");
      } else {
        setErr(errMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Tạo project mới</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Tên project *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Slug (URL) *
            <input
              value={slugDisplay}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value);
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="mt-1 block text-[10px] font-normal text-zinc-500">Tự sinh từ tên, có thể sửa.</span>
          </label>
          {slugErr ? <p className="text-xs text-red-600">{slugErr}</p> : null}
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Mô tả
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="text-[10px] text-zinc-500">{description.length}/500</span>
          </label>
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-600">
            Huỷ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Đang tạo…" : "Tạo project"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditProjectModal({
  item,
  onClose,
  onSaved,
}: {
  item: ProjectListItem;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    const n = name.trim();
    if (n.length < 3 || n.length > 100) {
      setErr("Tên project phải từ 3 đến 100 ký tự");
      return;
    }
    if (description.length > 500) {
      setErr("Mô tả tối đa 500 ký tự");
      return;
    }
    setSubmitting(true);
    try {
      await patchProject(item.id, {
        name: n,
        description: description.trim() || null,
      });
      await onSaved();
    } catch (e) {
      setErr(errMessage(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Sửa project</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            ✕
          </button>
        </div>
        <p className="mt-1 font-mono text-xs text-zinc-500">{item.slug}</p>
        <div className="mt-4 space-y-3">
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Tên project *
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
          <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            Mô tả
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <span className="text-[10px] text-zinc-500">{description.length}/500</span>
          </label>
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold dark:border-zinc-600">
            Huỷ
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void submit()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {submitting ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
