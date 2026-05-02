"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import { approveAllDiffReview, fetchDocumentDiff, fetchDiffReviewStatus, patchDiffChange } from "@/features/diff-viewer/api";
import type { DiffChange, DiffReview } from "@/features/diff-viewer/types";
import { fetchDocumentVersions } from "@/features/documents/api";
import type { VersionDetail } from "@/features/documents/types";

type Role = "pm" | "admin" | "qc" | "dev";
type ChangeKind = "add" | "delete" | "edit";

function safeMarked(md: string) {
  // Use the same markdown->HTML strategy as Document viewer (GFM + line breaks).
  // NOTE: If you need strict XSS safety for untrusted content, sanitize the HTML.
  return marked.parse(md || "", { gfm: true, breaks: true }) as string;
}

function SmallPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300">
      {children}
    </span>
  );
}

function toChangeKind(t: string): ChangeKind {
  const x = (t || "").toLowerCase();
  if (x === "added") return "add";
  if (x === "removed") return "delete";
  return "edit";
}

function kindLabel(k: ChangeKind) {
  if (k === "add") return "Thêm mới";
  if (k === "delete") return "Xoá";
  return "Chỉnh sửa";
}

function kindTone(k: ChangeKind) {
  if (k === "add")
    return "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30";
  if (k === "delete")
    return "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30";
  return "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30";
}

function pickDefaultVersions(versions: VersionDetail[]) {
  const byNo = [...versions].sort((a, b) => (b.version_no ?? 0) - (a.version_no ?? 0));
  const latestApproved = byNo.find((v) => (v.status || "").toLowerCase() === "approved");
  const latestReady = byNo.find((v) => (v.status || "").toLowerCase() === "ready_for_review");
  return { latestApproved, latestReady };
}

export function DiffViewerClient({
  projectId,
  projectName,
  docId,
  docTitle,
  initialRole,
  initialFrom,
  initialTo,
}: {
  projectId?: string;
  projectName: string;
  docId?: string;
  docTitle: string;
  initialRole: Role;
  initialFrom?: string;
  initialTo?: string;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const canApprove = role === "pm" || role === "admin";

  const [versions, setVersions] = useState<VersionDetail[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // These are expected to be version UUIDs
  const [fromId, setFromId] = useState<string | undefined>(initialFrom);
  const [toId, setToId] = useState<string | undefined>(initialTo);

  const [diffReview, setDiffReview] = useState<DiffReview | null>(null);
  const [changes, setChanges] = useState<DiffChange[]>([]);
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [polling, setPolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const summary = useMemo(() => {
    const adds = changes.filter((c) => toChangeKind(c.change_type) === "add").length;
    const dels = changes.filter((c) => toChangeKind(c.change_type) === "delete").length;
    const edits = changes.filter((c) => toChangeKind(c.change_type) === "edit").length;
    return { total: changes.length, adds, dels, edits };
  }, [changes]);

  const approvedCount = diffReview?.approved_count ?? 0;

  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const backHref =
    docId && projectId
      ? `/documents/${encodeURIComponent(docId)}?projectId=${encodeURIComponent(projectId)}`
      : docId
        ? `/documents/${encodeURIComponent(docId)}`
        : projectId
          ? `/documents?projectId=${encodeURIComponent(projectId)}`
          : "/documents";

  const approveHrefBase = projectId
    ? `/diff-review/approve?projectId=${encodeURIComponent(projectId)}`
    : "/diff-review/approve";
  const diffReviewId = diffReview?.id;
  const approveSelectedHref =
    docId
      ? `${approveHrefBase}&docId=${encodeURIComponent(docId)}${fromId ? `&from=${encodeURIComponent(fromId)}` : ""}${toId ? `&to=${encodeURIComponent(toId)}` : ""}${diffReviewId ? `&diffReviewId=${encodeURIComponent(diffReviewId)}` : ""}&mode=selected`
      : `${approveHrefBase}${fromId ? `&from=${encodeURIComponent(fromId)}` : ""}${toId ? `&to=${encodeURIComponent(toId)}` : ""}${diffReviewId ? `&diffReviewId=${encodeURIComponent(diffReviewId)}` : ""}&mode=selected`;

  const approveAllHref =
    docId
      ? `${approveHrefBase}&docId=${encodeURIComponent(docId)}${fromId ? `&from=${encodeURIComponent(fromId)}` : ""}${toId ? `&to=${encodeURIComponent(toId)}` : ""}${diffReviewId ? `&diffReviewId=${encodeURIComponent(diffReviewId)}` : ""}&mode=all`
      : `${approveHrefBase}${fromId ? `&from=${encodeURIComponent(fromId)}` : ""}${toId ? `&to=${encodeURIComponent(toId)}` : ""}${diffReviewId ? `&diffReviewId=${encodeURIComponent(diffReviewId)}` : ""}&mode=all`;

  useEffect(() => {
    if (!docId) return;
    const documentId = docId;
    let cancelled = false;
    async function load() {
      setLoadingVersions(true);
      setErrorMsg(null);
      try {
        const res = await fetchDocumentVersions(documentId);
        if (cancelled) return;
        setVersions(res.versions ?? []);
        if (!fromId || !toId) {
          const { latestApproved, latestReady } = pickDefaultVersions(res.versions ?? []);
          if (!fromId && latestApproved) setFromId(latestApproved.id);
          if (!toId && latestReady) setToId(latestReady.id);
        }
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Không tải được versions");
      } finally {
        if (!cancelled) setLoadingVersions(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId]);

  useEffect(() => {
    if (!docId) return;
    if (!fromId || !toId) return;
    const documentId = docId;
    const oldVersionId = fromId;
    const newVersionId = toId;

    let cancelled = false;
    let timer: number | undefined;

    async function loadDiff() {
      setLoadingDiff(true);
      setErrorMsg(null);
      try {
        const res = await fetchDocumentDiff({
          documentId: documentId,
          old_version_id: oldVersionId,
          new_version_id: newVersionId,
        });
        if (cancelled) return;
        setDiffReview(res.data.diff_review);
        setChanges(res.data.changes ?? []);
        const st = (res.data.diff_review.status || "").toLowerCase();
        setPolling(res.status === 202 || st === "processing" || st === "pending");
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : "Không tải được diff");
        setPolling(false);
      } finally {
        if (!cancelled) setLoadingDiff(false);
      }
    }

    async function poll() {
      const id = diffReview?.id;
      if (!id) {
        timer = window.setTimeout(poll, 3000);
        return;
      }
      try {
        const st = await fetchDiffReviewStatus(id);
        if (cancelled) return;
        const s = (st.status || "").toLowerCase();
        if (s === "ready" || s === "approved") {
          setPolling(false);
          await loadDiff();
          return;
        }
      } catch {
        // keep polling
      }
      timer = window.setTimeout(poll, 3000);
    }

    loadDiff().then(() => {
      timer = window.setTimeout(poll, 3000);
    });

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docId, fromId, toId]);

  async function onSetApproval(changeId: string, approval_status: "approved" | "rejected" | "pending") {
    if (!canApprove) return;
    if (!diffReview || diffReview.is_readonly) return;
    try {
      const res = await patchDiffChange(changeId, { approval_status });
      setChanges((prev) =>
        prev.map((c) => (c.id === changeId ? { ...c, approval_status: res.approval_status, approve_note: res.approve_note } : c)),
      );
      setDiffReview((prev) =>
        prev
          ? {
              ...prev,
              approved_count: res.diff_review_summary.approved_count,
              rejected_count: res.diff_review_summary.rejected_count,
              pending_count: res.diff_review_summary.pending_count,
            }
          : prev,
      );
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không cập nhật được approval");
    }
  }

  async function onApproveAllShortcut() {
    if (!canApprove) return;
    if (!diffReview?.id || diffReview.is_readonly) return;
    setLoadingDiff(true);
    setErrorMsg(null);
    try {
      await approveAllDiffReview(diffReview.id, { review_note: "Approve toàn bộ" });
      setPolling(true);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Không approve-all được");
    } finally {
      setLoadingDiff(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
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
            <Link
              href={backHref}
              className="font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              {docTitle}
            </Link>{" "}
            <span aria-hidden className="mx-1">
              ›
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">Diff viewer</span>
          </nav>

          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/40">
            {(["pm", "admin", "qc", "dev"] as const).map((r) => {
              const selected = role === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={[
                    "px-3 py-2 text-xs font-semibold transition",
                    selected
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/40",
                  ].join(" ")}
                >
                  {r}
                </button>
              );
            })}
          </div>
        </div>

        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              So sánh{" "}
              <span className="font-mono">
                {fromId ?? "—"}
              </span>{" "}
              với{" "}
              <span className="font-mono">
                {toId ?? "—"}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Old</span>
                <select
                  value={fromId ?? ""}
                  onChange={(e) => setFromId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={loadingVersions || !docId}
                >
                  <option value="" disabled>
                    {loadingVersions ? "Đang tải..." : "Chọn version"}
                  </option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_no} — {String(v.status)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">New</span>
                <select
                  value={toId ?? ""}
                  onChange={(e) => setToId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={loadingVersions || !docId}
                >
                  <option value="" disabled>
                    {loadingVersions ? "Đang tải..." : "Chọn version"}
                  </option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_no} — {String(v.status)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white">
                AI
              </div>
              <div>
                <p className="font-semibold">
                  Tìm thấy {summary.total} thay đổi: {summary.adds} thêm mới, {summary.dels} xoá,{" "}
                  {summary.edits} chỉnh sửa
                </p>
                <p className="mt-1 text-blue-800/80 dark:text-blue-200/80">
                  {polling ? "Đang xử lý diff… (polling mỗi 3s)" : "Diff đã sẵn sàng."}
                </p>
                {diffReview?.ai_summary ? (
                  <p className="mt-1 text-blue-800/80 dark:text-blue-200/80">{diffReview.ai_summary}</p>
                ) : null}
              </div>
            </div>
          </div>

          {errorMsg ? (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
              {errorMsg}
            </div>
          ) : null}
        </section>

        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* Jump nav */}
          <aside className="col-span-12 md:col-span-3">
            <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Jump</p>
              <div className="mt-3 space-y-2">
                {changes.map((c, idx) => {
                  const kind = toChangeKind(c.change_type);
                  const checked = (c.approval_status || "").toLowerCase() === "approved";
                  const title = c.chunk_new?.section ?? c.chunk_old?.section ?? "Change";
                  return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      blockRefs.current[c.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 dark:hover:bg-zinc-800/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                        {idx + 1}. {title}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                        {kindLabel(kind)}
                      </p>
                    </div>
                    {checked ? <SmallPill>✓</SmallPill> : <SmallPill> </SmallPill>}
                  </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Diff columns */}
          <main className="col-span-12 md:col-span-9">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Version cũ
                  </p>
                  <SmallPill>Cũ</SmallPill>
                </div>
                <div className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                  Cột trái hiển thị nội dung version cũ theo từng change.
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Version mới
                  </p>
                  <SmallPill>Mới</SmallPill>
                </div>
                <div className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                  Cột phải hiển thị nội dung version mới theo từng change.
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {loadingDiff ? (
                <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 text-sm text-zinc-700 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                  Đang tải diff…
                </div>
              ) : null}

              {changes.map((c) => {
                const kind = toChangeKind(c.change_type);
                const checked = (c.approval_status || "").toLowerCase() === "approved";
                const canToggle = canApprove && !diffReview?.is_readonly;
                const oldHtml = safeMarked(c.chunk_old?.content_text ?? "");
                const newHtml = safeMarked(c.chunk_new?.content_text ?? "");
                return (
                  <div
                    key={c.id}
                    ref={(el) => {
                      blockRefs.current[c.id] = el;
                    }}
                    className={[
                      "rounded-2xl border p-4 shadow-sm",
                      kindTone(kind),
                      "bg-white/70 dark:bg-zinc-950/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          Change #{c.change_index ?? "—"} — {c.chunk_new?.section ?? c.chunk_old?.section ?? "Change"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {kindLabel(kind)}
                        </p>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canToggle}
                          onChange={(e) => onSetApproval(c.id, e.target.checked ? "approved" : "pending")}
                          className="h-4 w-4 accent-violet-600"
                        />
                        Approve thay đổi này
                      </label>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/10">
                        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          Old
                        </p>
                        <div
                          className="prose prose-zinc mt-2 max-w-none text-sm dark:prose-invert [&_del]:bg-red-200/60 [&_del]:text-red-900 [&_del]:line-through dark:[&_del]:bg-red-900/40 dark:[&_del]:text-red-200"
                          dangerouslySetInnerHTML={{ __html: oldHtml || "<p>—</p>" }}
                        />
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/10">
                        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          New
                        </p>
                        <div
                          className="prose prose-zinc mt-2 max-w-none text-sm dark:prose-invert [&_ins]:bg-emerald-200/60 [&_ins]:text-emerald-900 dark:[&_ins]:bg-emerald-900/40 dark:[&_ins]:text-emerald-200"
                          dangerouslySetInnerHTML={{ __html: newHtml || "<p>—</p>" }}
                        />
                      </div>
                    </div>

                    {!canApprove ? (
                      <p className="mt-3 text-xs font-semibold text-amber-900 dark:text-amber-200">
                        Chỉ PM/Admin mới được approve.
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </main>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div className="sticky bottom-0 z-40 border-t border-zinc-200/70 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Đã approve {approvedCount}/{summary.total} thay đổi
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={backHref}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
            >
              Huỷ
            </Link>

            <Link
              href={approveSelectedHref}
              aria-disabled={!canApprove || approvedCount === 0}
              tabIndex={!canApprove || approvedCount === 0 ? -1 : 0}
              onClick={(e) => {
                if (!canApprove || approvedCount === 0) e.preventDefault();
              }}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                !canApprove || approvedCount === 0
                  ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700",
              ].join(" ")}
            >
              Approve đã chọn
            </Link>

            <Link
              href={approveAllHref}
              aria-disabled={!canApprove}
              tabIndex={!canApprove ? -1 : 0}
              onClick={(e) => {
                if (!canApprove) e.preventDefault();
              }}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                !canApprove
                  ? "cursor-not-allowed border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30"
                  : "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60",
              ].join(" ")}
            >
              Approve tất cả
            </Link>

            <button
              type="button"
              disabled={!canApprove || !diffReview?.id || diffReview.is_readonly}
              onClick={onApproveAllShortcut}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                !canApprove || !diffReview?.id || diffReview.is_readonly
                  ? "cursor-not-allowed border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30"
                  : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60",
              ].join(" ")}
            >
              Approve-all shortcut
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

