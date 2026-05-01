"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import type { AxiosError } from "axios";

import { fetchProjectDetail } from "@/features/projects";
import {
  fetchDocumentVersions,
  fetchProjectDocumentScreens,
  fetchProjectDocuments,
  type DocStatus,
  type DocType,
  type DocumentListItem,
  type LatestVersion,
  type ScreenCountItem,
  type VersionDetail,
} from "@/features/documents";
import { useAppSelector } from "@/store/hooks";

type PagePagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

function StatusBadge({ status }: { status: DocStatus }) {
  const styles =
    status === "approved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
      : status === "ready_for_review"
        ? "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200"
        : status === "processing"
          ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          : status === "rejected"
            ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
            : "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        styles,
      ].join(" ")}
    >
      {status === "processing" ? (
        <span
          aria-hidden
          className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      ) : null}
      {status}
    </span>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 864e5;
  if (diff < 1) return "Hôm nay";
  if (diff < 2) return "1 ngày trước";
  if (diff < 8) return `${Math.floor(diff)} ngày trước`;
  return d.toLocaleDateString("vi-VN");
}

function errMessage(e: unknown): string {
  const ax = e as AxiosError<{ message?: string }>;
  const m = ax.response?.data?.message;
  return typeof m === "string" ? m : "Không thể tải dữ liệu.";
}

const docTypeLabel: Record<DocType, string> = {
  basic_design: "Basic Design",
  api_design: "API Design",
  detail_design: "Detail Design",
  testcase_manual: "Testcase Manual",
  figma: "Figma",
};

const statusOptions: Array<DocStatus> = ["draft", "processing", "ready_for_review", "approved", "rejected"];

export function DocumentsClientApi({ projectId }: { projectId?: string }) {
  const authUser = useAppSelector((s) => s.auth.user);

  const [myRole, setMyRole] = useState<string | null>(null);

  const [docType, setDocType] = useState<DocType | "all">(() => {
    if (typeof window === "undefined") return "all";
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("doc_type");
    return raw && Object.prototype.hasOwnProperty.call(docTypeLabel, raw) ? (raw as DocType) : "all";
  });
  const [screen, setScreen] = useState<string | "all">(() => {
    if (typeof window === "undefined") return "all";
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("screen");
    return raw && raw.trim() ? raw : "all";
  });
  const [status, setStatus] = useState<DocStatus | "all">(() => {
    if (typeof window === "undefined") return "all";
    const sp = new URLSearchParams(window.location.search);
    const raw = sp.get("status");
    return raw && statusOptions.includes(raw as DocStatus) ? (raw as DocStatus) : "all";
  });
  const [searchInput, setSearchInput] = useState(() => {
    if (typeof window === "undefined") return "";
    const sp = new URLSearchParams(window.location.search);
    return sp.get("search") ?? "";
  });
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [page, setPage] = useState(() => {
    if (typeof window === "undefined") return 1;
    const sp = new URLSearchParams(window.location.search);
    const rawPage = sp.get("page");
    const n = rawPage ? Number(rawPage) : NaN;
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  });
  const [perPage] = useState(50);
  const [pagination, setPagination] = useState<PagePagination>({
    total: 0,
    page: 1,
    per_page: 50,
    total_pages: 0,
  });

  const [screens, setScreens] = useState<ScreenCountItem[]>([]);
  const [docs, setDocs] = useState<DocumentListItem[]>([]);
  const [hasProcessing, setHasProcessing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [versionsByDocId, setVersionsByDocId] = useState<Record<string, VersionDetail[] | undefined>>({});
  const [loadingVersions, setLoadingVersions] = useState<Record<string, boolean>>({});

  const canUpload = myRole === "pm" || myRole === "owner" || myRole === "admin";

  const projectName = useMemo((): string => {
    if (!projectId) return "—";
    if (projectId === "p_qcmaster") return "QC Master";
    if (projectId === "p_castinghub") return "CastingHub";
    if (projectId === "p_legacy") return "Legacy Portal";
    return projectId;
  }, [projectId]);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // Load project role (for upload permissions)
  useEffect(() => {
    if (!projectId) return;
    let alive = true;
    void (async () => {
      try {
        const res = await fetchProjectDetail(projectId);
        if (!alive) return;
        setMyRole(res.my_role);
      } catch {
        if (!alive) return;
        // ignore: backend will still protect list endpoints
        setMyRole(authUser?.role ?? null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authUser?.role, projectId]);

  const loadScreens = useCallback(async () => {
    if (!projectId) return;
    const res = await fetchProjectDocumentScreens(projectId);
    setScreens(res.screens);
  }, [projectId]);

  const loadDocs = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetchProjectDocuments({
        projectId,
        doc_type: docType === "all" ? undefined : docType,
        screen: screen === "all" ? undefined : screen,
        search: debouncedSearch.trim() ? debouncedSearch : undefined,
        status: status === "all" ? undefined : status,
        page,
        per_page: perPage,
      });
      setDocs(res.data);
      setPagination(res.pagination);
      setHasProcessing(res.has_processing);
    } catch (e) {
      setError(errMessage(e));
      setDocs([]);
      setHasProcessing(false);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, docType, page, perPage, projectId, screen, status]);

  // Fetch on filter change
  useEffect(() => {
    if (!projectId) return;
    startTransition(() => {
      void loadDocs();
    });
  }, [loadDocs, projectId]);

  // Fetch screens once (or when project changes)
  useEffect(() => {
    if (!projectId) return;
    startTransition(() => {
      void loadScreens().catch(() => {
        // keep empty list; backend list endpoint still works
      });
    });
  }, [loadScreens, projectId]);

  // Polling when there is processing
  useEffect(() => {
    if (!hasProcessing) return;
    if (!projectId) return;
    const t = window.setInterval(() => {
      void loadDocs();
    }, 5000);
    return () => window.clearInterval(t);
  }, [hasProcessing, loadDocs, projectId]);

  const toggleExpanded = useCallback(
    async (docId: string) => {
      const nextOpen = !expanded[docId];
      setExpanded((m) => ({ ...m, [docId]: nextOpen }));
      if (!nextOpen) return;
      if (versionsByDocId[docId] && versionsByDocId[docId]!.length > 0) return;

      setLoadingVersions((m) => ({ ...m, [docId]: true }));
      try {
        const res = await fetchDocumentVersions(docId);
        setVersionsByDocId((m) => ({ ...m, [docId]: res.versions }));
      } catch {
        setVersionsByDocId((m) => ({ ...m, [docId]: [] }));
      } finally {
        setLoadingVersions((m) => ({ ...m, [docId]: false }));
      }
    },
    [expanded, versionsByDocId],
  );

  const screenLabel = useCallback(
    (s: string) => {
      const map: Record<string, string> = {
        login: "Login",
        dashboard: "Dashboard",
        documents: "Documents",
        diff_viewer: "Diff Viewer",
        chat: "Chat",
      };
      return map[s] ?? s;
    },
    [],
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-12 gap-6 px-6 py-8">
        <aside className="col-span-12 md:col-span-3">
          <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">Project</p>
            <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">{projectName}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {projectId ? `ID: ${projectId}` : "Chưa chọn project"}
            </p>

            <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">Project nav</p>
              <nav className="mt-2 space-y-1">
                <Link
                  href={projectId ? `/documents?projectId=${encodeURIComponent(projectId)}` : "/documents"}
                  className="block rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                >
                  Documents
                </Link>
                <Link
                  href={projectId ? `/chat?projectId=${encodeURIComponent(projectId)}` : "/chat"}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Chatbot
                </Link>
                <Link
                  href="/testcases"
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Testcases
                </Link>
              </nav>
            </div>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9">
          <div className="flex flex-col gap-4">
            <div>
              <nav className="text-sm text-zinc-600 dark:text-zinc-400">
                <Link
                  href="/projects"
                  className="font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                  Projects
                </Link>{" "}
                <span aria-hidden className="mx-1">
                  ›
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{projectName}</span>{" "}
                <span aria-hidden className="mx-1">
                  ›
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">Documents</span>
              </nav>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Document list</h1>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    Danh sách tài liệu theo project. Expand để xem version.
                  </p>
                </div>
                {canUpload ? (
                  <Link
                    href={projectId ? `/documents/upload?projectId=${encodeURIComponent(projectId)}` : "/documents/upload"}
                    className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
                  >
                    + Upload tài liệu
                  </Link>
                ) : null}
              </div>
            </div>

            <section className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loại</span>
                    <select
                      value={docType}
                      onChange={(e) => {
                        const v = e.target.value as DocType | "all";
                        setDocType(v);
                        setPage(1);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    >
                      <option value="all">Tất cả</option>
                      {(Object.keys(docTypeLabel) as DocType[]).map((t) => (
                        <option key={t} value={t}>
                          {docTypeLabel[t]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Màn hình</span>
                    <select
                      value={screen}
                      onChange={(e) => {
                        const v = e.target.value;
                        setScreen(v === "all" ? "all" : v);
                        setPage(1);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    >
                      <option value="all">Tất cả</option>
                      {screens.map((s) => (
                        <option key={s.screen_name} value={s.screen_name}>
                          {screenLabel(s.screen_name)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Trạng thái</span>
                    <select
                      value={status}
                      onChange={(e) => {
                        const v = e.target.value as DocStatus | "all";
                        setStatus(v);
                        setPage(1);
                      }}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    >
                      <option value="all">Tất cả</option>
                      {statusOptions.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-1 items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Search</span>
                    <input
                      value={searchInput}
                      onChange={(e) => {
                        setSearchInput(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Tìm theo tên màn hình…"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    />
                  </label>
                </div>
              </div>
            </section>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                <p>{error}</p>
                <button type="button" onClick={() => startTransition(() => void loadDocs())} className="mt-2 text-xs font-semibold underline">
                  Thử lại
                </button>
              </div>
            ) : null}

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="grid grid-cols-12 gap-0 border-b border-zinc-200/70 px-4 py-3 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <div className="col-span-4">Màn hình</div>
                <div className="col-span-2">Loại</div>
                <div className="col-span-1">Version</div>
                <div className="col-span-2">Trạng thái</div>
                <div className="col-span-1">Cập nhật</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {loading ? (
                <div className="px-4 py-6">
                  <div className="grid grid-cols-1 gap-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-16 animate-pulse rounded-xl border border-zinc-200/70 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/40"
                      />
                    ))}
                  </div>
                </div>
              ) : docs.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Không có tài liệu phù hợp.</p>
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                  {docs.map((doc) => {
                    const isOpen = !!expanded[doc.id];
                    const latest = doc.latest_version;
                    const currentVersions = versionsByDocId[doc.id];
                    const versionsLoaded = Array.isArray(currentVersions);
                    const showLoading = isOpen && loadingVersions[doc.id] && !versionsLoaded;

                    const viewHref = projectId ? `/documents/${encodeURIComponent(doc.id)}?projectId=${encodeURIComponent(projectId)}` : `/documents/${encodeURIComponent(doc.id)}`;
                    const uploadHref = projectId ? `/documents/upload?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(doc.id)}` : `/documents/upload?docId=${encodeURIComponent(doc.id)}`;

                    const diffHref = projectId
                      ? `/diff-review?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(doc.id)}`
                      : `/diff-review?docId=${encodeURIComponent(doc.id)}`;

                    return (
                      <li key={doc.id} className="px-4 py-4">
                        <div className="grid grid-cols-12 items-center gap-0">
                          <div className="col-span-4 flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() => void toggleExpanded(doc.id)}
                              className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                              aria-label={isOpen ? "Collapse versions" : "Expand versions"}
                            >
                              <span className={isOpen ? "inline-block rotate-90 transform" : "inline-block rotate-0 transform"}>▶</span>
                            </button>

                            <div className="min-w-0">
                              <Link
                                href={viewHref}
                                className="block truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                              >
                                {screenLabel(doc.screen_name)}
                              </Link>
                              <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">{doc.id}</p>
                            </div>
                          </div>

                          <div className="col-span-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {docTypeLabel[doc.doc_type as DocType] ?? doc.doc_type}
                          </div>
                          <div className="col-span-1 text-sm text-zinc-700 dark:text-zinc-300">v{latest.version_no}</div>
                          <div className="col-span-2">
                            <StatusBadge status={latest.status} />
                          </div>
                          <div className="col-span-1 text-xs text-zinc-600 dark:text-zinc-400">{formatRelative(latest.created_at)}</div>
                          <div className="col-span-1 flex justify-end gap-2">
                            <Link
                              href={viewHref}
                              className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                              title="Xem"
                            >
                              👁
                            </Link>
                            <Link
                              href={diffHref}
                              className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                              title="So sánh version"
                            >
                              ⇄
                            </Link>
                            {canUpload ? (
                              <Link
                                href={uploadHref}
                                className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                                title="Upload version mới"
                              >
                                ⬆
                              </Link>
                            ) : null}
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/10">
                            <div className="grid grid-cols-12 gap-0 border-b border-zinc-200/70 px-3 py-2 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                              <div className="col-span-2">Version</div>
                              <div className="col-span-4">Status</div>
                              <div className="col-span-3">Updated</div>
                              <div className="col-span-3">User</div>
                            </div>

                            {showLoading ? (
                              <div className="px-3 py-2">
                                {Array.from({ length: 3 }).map((_, i) => (
                                  <div
                                    key={i}
                                    className="mb-2 h-12 animate-pulse rounded-lg border border-zinc-200/60 bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-900/40"
                                  />
                                ))}
                              </div>
                            ) : (
                              <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                                {(() => {
                                  const versionList: Array<VersionDetail | LatestVersion> = currentVersions?.length
                                    ? currentVersions
                                    : [latest];
                                  return versionList.map((v) => {
                                    const createdAt = v.created_at ?? null;
                                    const createdBy = v.created_by?.full_name ?? "—";
                                    const statusVal = v.status;
                                    const versionNo = v.version_no;
                                    return (
                                      <li key={v.id} className="px-3 py-2">
                                        <div className="grid grid-cols-12 items-center gap-0">
                                          <div className="col-span-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                            v{versionNo}
                                          </div>
                                          <div className="col-span-4">
                                            <StatusBadge status={statusVal} />
                                          </div>
                                          <div className="col-span-3 text-xs text-zinc-600 dark:text-zinc-400">
                                            {formatRelative(createdAt)}
                                          </div>
                                          <div className="col-span-3 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                            {createdBy}
                                          </div>
                                        </div>
                                      </li>
                                    );
                                  });
                                })()}
                              </ul>
                            )}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {pagination.total_pages > 1 ? (
              <div className="flex items-center justify-between gap-3 pt-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = Math.max(1, page - 1);
                    setPage(next);
                  }}
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-semibold disabled:opacity-40 dark:border-zinc-700"
                >
                  Trước
                </button>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">
                  Trang {pagination.page} / {pagination.total_pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.total_pages}
                  onClick={() => {
                    const next = Math.min(pagination.total_pages, page + 1);
                    setPage(next);
                  }}
                  className="rounded-lg border border-zinc-200 px-3 py-1 text-sm font-semibold disabled:opacity-40 dark:border-zinc-700"
                >
                  Sau
                </button>
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

