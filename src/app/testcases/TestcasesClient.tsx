"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  deleteTestcase,
  fetchProjectTestcaseScreens,
  fetchProjectTestcaseStats,
  fetchProjectTestcases,
  fetchTestcaseGenerateJobStatus,
  patchTestcasesBulk,
  postTestcaseGenerate,
} from "@/features/testcases";
import type { TestcaseListItem, TestcaseScreenAgg } from "@/features/testcases/types";
import { fetchProjectDetail } from "@/features/projects";
import { fetchProjectDocumentScreens } from "@/features/documents";
import type { ScreenCountItem } from "@/features/documents";

type Role = "qc" | "pm" | "admin" | "dev" | "owner";

const DOC_TYPE_OPTIONS: { id: string; label: string }[] = [
  { id: "basic_design", label: "Basic Design" },
  { id: "api_design", label: "API Design" },
  { id: "detail_design", label: "Detail Design" },
  { id: "testcase_manual", label: "Testcase Manual" },
];

function isUuid(s: string | undefined): s is string {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function priorityTone(p: string) {
  const x = p.toLowerCase();
  if (x === "critical")
    return "border-red-700 bg-red-700 text-white dark:border-red-800 dark:bg-red-800 dark:text-white";
  if (x === "high")
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  if (x === "medium")
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
}

function statusTone(s: string) {
  const x = s.toLowerCase();
  if (x === "active")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (x === "archived")
    return "border-zinc-300 bg-zinc-200 text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
}

function Pill({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span className={["inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold", className].join(" ")}>
      {children}
    </span>
  );
}

type ToastState = { open: boolean; title: string; body: string };

function Toast({ state, onClose }: { state: ToastState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed bottom-6 right-6 z-60 w-[380px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{state.title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{state.body}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/40"
          aria-label="Close toast"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  widthClass,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClass: string;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 py-10">
        <div
          className={[
            "w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950",
            widthClass,
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/40"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-5">{children}</div>
        </div>
      </div>
    </>
  );
}

function apiErrMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | undefined;
    if (d && typeof d.message === "string") return d.message;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export function TestcasesClient({
  projectId,
  initialRole,
}: {
  projectId?: string;
  initialRole: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const canWrite = role === "qc" || role === "pm" || role === "admin" || role === "owner";

  const projectOk = isUuid(projectId);
  const [projectName, setProjectName] = useState<string>(projectOk ? "…" : "—");

  const [screens, setScreens] = useState<TestcaseScreenAgg[]>([]);
  const [stats, setStats] = useState<{ needs_review: number; total_testcases: number } | null>(null);

  const [filterScreen, setFilterScreen] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  /** all | active | draft | archived | needs_review */
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const [rows, setRows] = useState<TestcaseListItem[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 20, total_pages: 1 });
  const [summary, setSummary] = useState<{ needs_review_count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [genOpen, setGenOpen] = useState(false);
  const [genScreen, setGenScreen] = useState("");
  const [genScreenOptions, setGenScreenOptions] = useState<ScreenCountItem[]>([]);
  const [genDocTypes, setGenDocTypes] = useState<Record<string, boolean>>({
    basic_design: true,
    api_design: true,
    detail_design: false,
    testcase_manual: false,
  });
  const [genTcType, setGenTcType] = useState<"manual" | "api" | "e2e">("manual");
  const [genOverwrite, setGenOverwrite] = useState(false);
  const [genBusy, setGenBusy] = useState(false);
  const [genProgress, setGenProgress] = useState<string | null>(null);

  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<TestcaseListItem | null>(null);
  const [bulkPriOpen, setBulkPriOpen] = useState(false);

  const [toast, setToast] = useState<ToastState>({ open: false, title: "", body: "" });
  const showToast = useCallback((title: string, body: string) => {
    setToast({ open: true, title, body });
  }, []);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearchDebounced(searchInput.trim()), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!projectOk || !projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchProjectDetail(projectId);
        if (!cancelled) setProjectName(p.name);
      } catch {
        if (!cancelled) setProjectName("Project");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, projectOk]);

  useEffect(() => {
    if (!projectOk || !projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, st] = await Promise.all([
          fetchProjectTestcaseScreens(projectId),
          fetchProjectTestcaseStats(projectId),
        ]);
        if (cancelled) return;
        setScreens(s.screens);
        setStats({ needs_review: st.needs_review, total_testcases: st.total_testcases });
        if (s.screens[0]?.screen_name) {
          setGenScreen((prev) => prev || s.screens[0]!.screen_name);
        }
      } catch {
        if (!cancelled) setScreens([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, projectOk]);

  const listParams = useMemo(() => {
    if (!projectOk || !projectId) return null;
    let statusParam: string | undefined;
    if (filterStatus === "all") statusParam = "active,draft,archived";
    else if (filterStatus === "active") statusParam = "active";
    else if (filterStatus === "draft") statusParam = "draft";
    else if (filterStatus === "archived") statusParam = "archived";
    else if (filterStatus === "needs_review") statusParam = "active,draft,archived";

    return {
      projectId,
      screen: filterScreen || undefined,
      tc_type: filterType || undefined,
      priority: filterPriority || undefined,
      status: statusParam,
      needs_review: filterStatus === "needs_review" ? true : undefined,
      search: searchDebounced || undefined,
      page,
      per_page: perPage,
    };
  }, [projectId, projectOk, filterScreen, filterType, filterPriority, filterStatus, searchDebounced, page]);

  useEffect(() => {
    if (!listParams) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchProjectTestcases(listParams);
        if (cancelled) return;
        setRows(res.data);
        setPagination(res.pagination);
        setSummary(res.summary);
      } catch (e) {
        if (!cancelled) setError(apiErrMessage(e, "Không tải được danh sách testcase."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listParams, perPage]);

  const tcEditorBase = useMemo(() => {
    const qs = new URLSearchParams();
    if (projectId) qs.set("projectId", projectId);
    return `/testcases/editor?${qs.toString()}`;
  }, [projectId]);

  const chatHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (projectId) qs.set("projectId", projectId);
    return `/chat?${qs.toString()}`;
  }, [projectId]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const selectedCount = selectedIds.length;

  const allChecked = rows.length > 0 && rows.every((r) => selected[r.id]);

  const hasActiveFilters =
    !!filterScreen ||
    !!filterType ||
    !!filterPriority ||
    filterStatus !== "all" ||
    !!searchDebounced;

  const clearFilters = () => {
    setFilterScreen("");
    setFilterType("");
    setFilterPriority("");
    setFilterStatus("all");
    setSearchInput("");
    setSearchDebounced("");
    setPage(1);
  };

  const bannerStorageKey = projectId ? `s12_tc_banner_dismiss_${projectId}` : "";
  useEffect(() => {
    if (!projectId) return;
    queueMicrotask(() => {
      if (!bannerStorageKey || typeof window === "undefined") return;
      setBannerDismissed(sessionStorage.getItem(bannerStorageKey) === "1");
    });
  }, [bannerStorageKey, projectId]);

  const showBanner =
    projectOk &&
    (summary?.needs_review_count ?? 0) > 0 &&
    !bannerDismissed &&
    filterStatus !== "needs_review";

  const dismissBanner = () => {
    setBannerDismissed(true);
    if (bannerStorageKey && typeof window !== "undefined") sessionStorage.setItem(bannerStorageKey, "1");
  };

  const needsReviewByScreen = useMemo(() => {
    const parts = screens
      .filter((s) => s.needs_review_count > 0)
      .map((s) => `${s.screen_name} (${s.needs_review_count} TC)`);
    return parts.join(", ");
  }, [screens]);

  const runBulk = async (action: "archive" | "delete" | "mark_reviewed") => {
    if (!projectOk || !projectId || selectedIds.length === 0) return;
    if (action === "delete") {
      const ok = window.confirm(`Xoá ${selectedIds.length} testcase? Không thể hoàn tác.`);
      if (!ok) return;
    }
    try {
      const res = await patchTestcasesBulk({
        projectId,
        action,
        testcase_ids: selectedIds,
      });
      showToast("Thành công", res.message);
      setSelected({});
      setPage(1);
      const r = await fetchProjectTestcases({ ...listParams!, page: 1 });
      setRows(r.data);
      setPagination(r.pagination);
      setSummary(r.summary);
      const s = await fetchProjectTestcaseScreens(projectId);
      setScreens(s.screens);
      const st = await fetchProjectTestcaseStats(projectId);
      setStats({ needs_review: st.needs_review, total_testcases: st.total_testcases });
    } catch (e) {
      showToast("Lỗi", apiErrMessage(e, "Bulk action thất bại."));
    }
  };

  const runBulkPriority = async (priority: "critical" | "high" | "medium" | "low") => {
    if (!projectOk || !projectId || selectedIds.length === 0) return;
    try {
      const res = await patchTestcasesBulk({ projectId, action: "set_priority", testcase_ids: selectedIds, priority });
      showToast("Thành công", res.message);
      setBulkPriOpen(false);
      setSelected({});
      const r = await fetchProjectTestcases(listParams!);
      setRows(r.data);
      setPagination(r.pagination);
      setSummary(r.summary);
    } catch (e) {
      showToast("Lỗi", apiErrMessage(e, "Đổi priority thất bại."));
    }
  };

  const confirmDelete = async () => {
    if (!deleteRow) return;
    try {
      const res = await deleteTestcase(deleteRow.id);
      showToast("Đã xoá", res.message);
      setDeleteRow(null);
      const r = await fetchProjectTestcases(listParams!);
      setRows(r.data);
      setPagination(r.pagination);
      setSummary(r.summary);
      const s = await fetchProjectTestcaseScreens(projectId!);
      setScreens(s.screens);
    } catch (e) {
      showToast("Lỗi", apiErrMessage(e, "Xoá testcase thất bại."));
    }
  };

  const markOneReviewed = async (id: string) => {
    if (!projectOk || !projectId) return;
    try {
      await patchTestcasesBulk({ projectId, action: "mark_reviewed", testcase_ids: [id] });
      showToast("Đã cập nhật", "Đã đánh dấu đã review.");
      const r = await fetchProjectTestcases(listParams!);
      setRows(r.data);
      setPagination(r.pagination);
      setSummary(r.summary);
      const s = await fetchProjectTestcaseScreens(projectId);
      setScreens(s.screens);
    } catch (e) {
      showToast("Lỗi", apiErrMessage(e, "Không cập nhật được."));
    }
  };

  const startGenerate = async () => {
    if (!projectOk || !projectId || !genScreen.trim()) {
      showToast("Thiếu thông tin", "Chọn màn hình và ít nhất một loại tài liệu.");
      return;
    }
    const doc_types = DOC_TYPE_OPTIONS.filter((d) => genDocTypes[d.id]).map((d) => d.id);
    if (doc_types.length === 0) {
      showToast("Thiếu thông tin", "Chọn ít nhất một loại tài liệu làm nguồn.");
      return;
    }
    setGenBusy(true);
    setGenProgress("Đang gửi yêu cầu generate…");
    try {
      const acc = await postTestcaseGenerate({
        projectId,
        screen_name: genScreen.trim(),
        doc_types,
        tc_type: genTcType,
        overwrite_existing: genOverwrite,
      });
      const jobId = acc.job_id;
      setGenProgress(acc.message || "Đang generate…");
      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
      for (;;) {
        await sleep(2000);
        const st = await fetchTestcaseGenerateJobStatus(projectId, jobId);
        const pct = st.progress?.percentage ?? 0;
        setGenProgress(`Đang xử lý… ${pct}%`);
        if (st.status === "done") {
          const n = st.result?.created_count ?? 0;
          showToast("Hoàn tất", `Đã tạo ${n} testcase cho màn hình ${acc.screen_name}.`);
          setGenOpen(false);
          setGenBusy(false);
          setGenProgress(null);
          window.scrollTo({ top: 0, behavior: "smooth" });
          const r = await fetchProjectTestcases({ ...listParams!, page: 1 });
          setRows(r.data);
          setPagination(r.pagination);
          setSummary(r.summary);
          const sc = await fetchProjectTestcaseScreens(projectId);
          setScreens(sc.screens);
          break;
        }
        if (st.status === "failed") {
          setGenBusy(false);
          setGenProgress(null);
          throw new Error(st.error_message || "Generate thất bại.");
        }
      }
    } catch (e) {
      setGenBusy(false);
      setGenProgress(null);
      showToast("Lỗi", apiErrMessage(e, "Generate thất bại."));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-none grid-cols-12 gap-6 px-6 py-8">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
          <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">Project</p>
            <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">{projectName}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {projectOk ? `ID: ${projectId}` : "Thêm ?projectId=&lt;uuid&gt; vào URL để tải testcase từ API."}
            </p>
            {stats ? (
              <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                Tổng: {stats.total_testcases} TC
                {stats.needs_review > 0 ? (
                  <span className="ml-2 font-semibold text-amber-700 dark:text-amber-300">· Cần review: {stats.needs_review}</span>
                ) : null}
              </p>
            ) : null}

            <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">Project nav</p>
              <nav className="mt-2 space-y-1">
                <Link
                  href={projectId ? `/documents?projectId=${encodeURIComponent(projectId)}` : "/documents"}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Documents
                </Link>
                <Link
                  href={projectId ? `/testcases?projectId=${encodeURIComponent(projectId)}` : "/testcases"}
                  className="block rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                >
                  Testcases
                </Link>
                <Link
                  href={
                    projectId
                      ? `/ai-prompts?projectId=${encodeURIComponent(projectId)}`
                      : "/ai-prompts"
                  }
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Prompt AI
                </Link>
                <Link
                  href={chatHref}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Hỏi AI
                </Link>
              </nav>
            </div>

            <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">Demo role (UI)</p>
              <div className="mt-2 inline-flex flex-wrap overflow-hidden rounded-lg border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/40">
                {(["qc", "pm", "admin", "owner", "dev"] as const).map((r) => {
                  const sel = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={[
                        "px-3 py-2 text-xs font-semibold transition",
                        sel
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/40",
                      ].join(" ")}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              {!canWrite ? (
                <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-200">Dev chỉ được xem (UI).</p>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Testcases</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Danh sách testcase — filter, bulk, generate AI (S12 + API qcbe).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={chatHref}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
              >
                Hỏi AI
              </Link>
              <button
                type="button"
                onClick={() => {
                  setGenOpen(true);
                  if (projectId) {
                    fetchProjectDocumentScreens(projectId).then((r) => setGenScreenOptions(r.screens)).catch(() => {});
                  }
                }}
                className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                disabled={!canWrite || !projectOk}
              >
                Generate TC bằng AI
              </button>
              <Link
                href={tcEditorBase}
                aria-disabled={!canWrite}
                tabIndex={!canWrite ? -1 : 0}
                onClick={(e) => {
                  if (!canWrite) e.preventDefault();
                }}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                  !canWrite
                    ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700",
                ].join(" ")}
              >
                + Tạo testcase mới
              </Link>
            </div>
          </div>

          {showBanner ? (
            <div className="relative mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              <button
                type="button"
                className="absolute right-2 top-2 rounded p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
                aria-label="Đóng banner"
                onClick={dismissBanner}
              >
                ✕
              </button>
              <p className="pr-8 font-semibold">
                ⚠ {summary?.needs_review_count ?? 0} testcase cần review lại — tài liệu liên quan vừa được cập nhật
              </p>
              {needsReviewByScreen ? <p className="mt-1 text-xs opacity-90">Màn hình: {needsReviewByScreen}</p> : null}
              <button
                type="button"
                className="mt-2 text-xs font-bold text-amber-900 underline dark:text-amber-200"
                onClick={() => {
                  setFilterStatus("needs_review");
                  setPage(1);
                }}
              >
                Xem tất cả →
              </button>
            </div>
          ) : null}

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="grid gap-3 lg:grid-cols-5">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Màn hình</span>
                <select
                  value={filterScreen}
                  onChange={(e) => {
                    setFilterScreen(e.target.value);
                    setPage(1);
                  }}
                  disabled={!projectOk}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="">Tất cả màn hình</option>
                  {screens.map((s) => (
                    <option key={s.screen_name} value={s.screen_name}>
                      {s.screen_name} ({s.tc_count})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loại TC</span>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    setPage(1);
                  }}
                  disabled={!projectOk}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="">Tất cả loại</option>
                  <option value="manual">Manual</option>
                  <option value="api">API</option>
                  <option value="e2e">E2E</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Priority</span>
                <select
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value);
                    setPage(1);
                  }}
                  disabled={!projectOk}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="">Tất cả priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Trạng thái</span>
                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                  disabled={!projectOk}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                  <option value="needs_review">Cần review</option>
                </select>
              </label>

              <label className="block lg:col-span-1">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Search tiêu đề</span>
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setPage(1);
                  }}
                  disabled={!projectOk}
                  placeholder="Debounce 300ms…"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                />
              </label>
            </div>

            {hasActiveFilters ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-violet-700 underline dark:text-violet-300"
                >
                  Xoá filter
                </button>
              </div>
            ) : null}

            {selectedCount > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/10">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Đã chọn {selectedCount} testcase</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canWrite || !projectOk}
                    onClick={() => runBulk("archive")}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                  >
                    Archive
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || !projectOk}
                    onClick={() => runBulk("delete")}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  >
                    Xoá
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || !projectOk}
                    onClick={() => setBulkPriOpen(true)}
                    className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 disabled:opacity-50 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200"
                  >
                    Đổi priority…
                  </button>
                  <button
                    type="button"
                    disabled={!canWrite || !projectOk}
                    onClick={() => runBulk("mark_reviewed")}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-50 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
                  >
                    Đánh dấu đã review
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected({})}
                    className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/40"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {!projectOk ? (
            <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-400">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Chưa có project UUID</p>
              <p className="mt-2">Mở từ danh sách project hoặc dùng URL dạng:</p>
              <code className="mt-2 inline-block rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">/testcases?projectId=&lt;uuid&gt;</code>
              <div className="mt-4">
                <Link href="/documents" className="text-sm font-semibold text-violet-700 underline dark:text-violet-300">
                  Đi tới Documents
                </Link>
              </div>
            </div>
          ) : error ? (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : (
            <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                      <th className="w-10 px-3 py-2.5 text-left">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => {
                            const next = e.target.checked;
                            const map: Record<string, boolean> = { ...selected };
                            for (const r of rows) map[r.id] = next;
                            setSelected(map);
                          }}
                          disabled={loading || rows.length === 0}
                          className="h-4 w-4 accent-violet-600"
                        />
                      </th>
                      <th className="w-28 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">ID</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tiêu đề</th>
                      <th className="w-28 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Màn hình</th>
                      <th className="w-24 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Priority</th>
                      <th className="w-20 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Loại</th>
                      <th className="w-24 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Trạng thái</th>
                      <th className="w-16 px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Tài liệu</th>
                      <th className="w-10 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          <td colSpan={9} className="px-3 py-3">
                            <div className="h-4 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                          </td>
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-600 dark:text-zinc-400">
                          {hasActiveFilters
                            ? "Không tìm thấy TC nào với bộ lọc hiện tại."
                            : "Chưa có testcase nào. Tạo TC đầu tiên hoặc generate bằng AI."}
                          {hasActiveFilters ? (
                            <button type="button" onClick={clearFilters} className="mt-3 block w-full text-center text-xs font-semibold text-violet-700 underline dark:text-violet-300">
                              Xoá filter
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ) : (
                      rows.map((r) => {
                        const isOpen = !!expanded[r.id];
                        const tcEditHref = `${tcEditorBase}${tcEditorBase.includes("?") ? "&" : "?"}tcId=${encodeURIComponent(r.id)}`;
                        const menuOpen = openActionMenu === r.id;
                        return (
                          <Fragment key={r.id}>
                            <tr
                              className={`cursor-pointer transition-colors hover:bg-violet-50/40 dark:hover:bg-violet-950/10 ${isOpen ? "bg-violet-50/30 dark:bg-violet-950/10" : ""}`}
                              onClick={() => setExpanded((m) => ({ ...m, [r.id]: !m[r.id] }))}
                            >
                              <td className="px-3 py-2.5">
                                <input
                                  type="checkbox"
                                  checked={!!selected[r.id]}
                                  onChange={(e) => setSelected((m) => ({ ...m, [r.id]: e.target.checked }))}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 accent-violet-600"
                                />
                              </td>
                              <td className="px-3 py-2.5">
                                <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                                  {r.needs_review ? (
                                    <span title="Tài liệu liên quan đã được cập nhật — cần review lại testcase này" className="mr-1 text-amber-500">⚠</span>
                                  ) : null}
                                  {r.tc_id}
                                </span>
                                <p className="mt-0.5 text-[11px] text-zinc-400">{r.updated_at?.slice(0, 10) ?? "—"}</p>
                              </td>
                              <td className="max-w-xs px-3 py-2.5">
                                <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{r.title}</p>
                                <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">{r.expected_result ?? "—"}</p>
                              </td>
                              <td className="px-3 py-2.5 text-xs text-zinc-600 dark:text-zinc-400">{r.screen_name || "—"}</td>
                              <td className="px-3 py-2.5">
                                <Pill className={priorityTone(r.priority)}>{r.priority}</Pill>
                              </td>
                              <td className="px-3 py-2.5 text-xs capitalize text-zinc-600 dark:text-zinc-400">{r.tc_type}</td>
                              <td className="px-3 py-2.5">
                                <Pill className={statusTone(r.status)}>{r.status}</Pill>
                              </td>
                              <td className="px-3 py-2.5 text-center text-xs font-semibold text-violet-600 dark:text-violet-400">
                                🔗 {r.linked_chunks_count}
                              </td>
                              <td className="relative px-2 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setOpenActionMenu(menuOpen ? null : r.id)}
                                  className="rounded-md px-2 py-1 text-base font-bold leading-none text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                                >
                                  ···
                                </button>
                                {menuOpen ? (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOpenActionMenu(null)} />
                                    <div className="absolute right-2 top-full z-20 mt-1 w-44 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                                      <Link
                                        href={tcEditHref}
                                        onClick={() => setOpenActionMenu(null)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                      >
                                        <span>👁</span> Xem
                                      </Link>
                                      <Link
                                        href={tcEditHref}
                                        onClick={() => setOpenActionMenu(null)}
                                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                      >
                                        <span>✎</span> Sửa
                                      </Link>
                                      {r.needs_review && canWrite ? (
                                        <button
                                          type="button"
                                          onClick={() => { setOpenActionMenu(null); void markOneReviewed(r.id); }}
                                          className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                        >
                                          <span>✓</span> Đánh dấu đã review
                                        </button>
                                      ) : null}
                                      <button
                                        type="button"
                                        disabled={!canWrite}
                                        onClick={() => { setOpenActionMenu(null); setDeleteRow(r); }}
                                        className="flex w-full items-center gap-2 border-t border-zinc-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 dark:border-zinc-800 dark:text-red-400 dark:hover:bg-red-950/30"
                                      >
                                        <span>🗑</span> Xoá
                                      </button>
                                    </div>
                                  </>
                                ) : null}
                              </td>
                            </tr>
                            {isOpen ? (
                              <tr key={`${r.id}-detail`} className="bg-zinc-50/60 dark:bg-zinc-800/20">
                                <td colSpan={9} className="px-6 py-4">
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Các bước (preview)</p>
                                      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                                        {(r.steps_preview ?? []).map((s, idx) => (
                                          <li key={idx}>{s}</li>
                                        ))}
                                      </ol>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Kết quả mong đợi</p>
                                      <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{r.expected_result ?? "—"}</p>
                                    </div>
                                  </div>
                                  {r.linked_chunks?.length ? (
                                    <div className="mt-3">
                                      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Chunk nguồn</p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {r.linked_chunks.map((ch) => {
                                          const label = `${ch.doc_type}${ch.section ? ` · ${ch.section}` : ""}${ch.is_primary ? " · ★" : ""}`;
                                          const cls = "inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700 transition hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50";
                                          return ch.document_id ? (
                                            <Link
                                              key={`${ch.chunk_id}-${ch.doc_type}`}
                                              href={`/documents/${encodeURIComponent(ch.document_id)}/viewer`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className={cls}
                                              title="Mở tài liệu nguồn"
                                            >
                                              🔗 {label}
                                            </Link>
                                          ) : (
                                            <span
                                              key={`${ch.chunk_id}-${ch.doc_type}`}
                                              className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400"
                                              title={ch.chunk_id}
                                            >
                                              {label}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  ) : null}
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {pagination.total > 0 ? (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                  <span>
                    Hiển thị {(pagination.page - 1) * pagination.per_page + 1}–
                    {Math.min(pagination.page * pagination.per_page, pagination.total)} / {pagination.total} testcase
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700"
                    >
                      ←
                    </button>
                    <span className="px-2 py-1 text-xs font-semibold">
                      {pagination.page} / {pagination.total_pages}
                    </span>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.total_pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-lg border border-zinc-200 px-3 py-1 text-xs font-semibold disabled:opacity-40 dark:border-zinc-700"
                    >
                      →
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          )}
        </main>
      </div>

      {genOpen ? (
        <Modal title="🤖 Generate testcase bằng AI" widthClass="max-w-[560px]" onClose={() => !genBusy && setGenOpen(false)}>
          {genProgress ? <p className="mb-3 text-sm text-violet-800 dark:text-violet-200">{genProgress}</p> : null}
          <label className="block">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Màn hình *</span>
            <select
              value={genScreen}
              onChange={(e) => setGenScreen(e.target.value)}
              disabled={genBusy}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50"
            >
              <option value="">— Chọn —</option>
              {genScreenOptions.map((s) => (
                <option key={s.screen_name} value={s.screen_name}>
                  {s.screen_name}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Loại tài liệu làm nguồn</p>
          <div className="mt-2 space-y-2">
            {DOC_TYPE_OPTIONS.map((d) => (
              <label key={d.id} className="flex items-center gap-2 text-sm text-zinc-800 dark:text-zinc-200">
                <input
                  type="checkbox"
                  checked={!!genDocTypes[d.id]}
                  disabled={genBusy}
                  onChange={(e) => setGenDocTypes((m) => ({ ...m, [d.id]: e.target.checked }))}
                />
                {d.label}
              </label>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Loại testcase</p>
          <div className="mt-2 flex gap-4 text-sm">
            {(["manual", "api", "e2e"] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 capitalize">
                <input type="radio" name="gtt" checked={genTcType === t} disabled={genBusy} onChange={() => setGenTcType(t)} />
                {t}
              </label>
            ))}
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
            <input type="checkbox" checked={genOverwrite} disabled={genBusy} onChange={(e) => setGenOverwrite(e.target.checked)} />
            Ghi đè TC draft cũ (overwrite_existing)
          </label>
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              disabled={genBusy}
              onClick={() => setGenOpen(false)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={genBusy || !canWrite}
              onClick={() => void startGenerate()}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {genBusy ? "Đang chạy…" : "🤖 Generate ngay"}
            </button>
          </div>
        </Modal>
      ) : null}

      {bulkPriOpen ? (
        <Modal title="Đổi priority" widthClass="max-w-[400px]" onClose={() => setBulkPriOpen(false)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Chọn priority mới cho {selectedCount} testcase.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["critical", "high", "medium", "low"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => void runBulkPriority(p)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold capitalize dark:border-zinc-700"
              >
                {p}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {deleteRow ? (
        <Modal title="Xác nhận xoá" widthClass="max-w-[520px]" onClose={() => setDeleteRow(null)}>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Xoá testcase <span className="font-mono font-semibold">{deleteRow.tc_id}</span> — {deleteRow.title}?
          </p>
          <p className="mt-2 text-xs text-zinc-500">Liên kết chunk: {deleteRow.linked_chunks_count}</p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteRow(null)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Xoá
            </button>
          </div>
        </Modal>
      ) : null}

      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />
    </div>
  );
}
