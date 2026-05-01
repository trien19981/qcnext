"use client";

import Link from "next/link";
import type { AxiosError } from "axios";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import {
  fetchChunkTestcases,
  fetchDocumentChunksOutline,
  fetchDocumentViewer,
  type ChunkOutlineItem,
  type ChunkTestcasesResponse,
  type DocumentViewerResponse,
  type ViewerChunk,
  type ViewerVersionItem,
} from "@/features/documents";

type TcDraft = {
  title: string;
  steps: string[];
  expected: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  type: "Manual" | "API" | "E2E";
};

const docTypeLabel: Record<string, string> = {
  basic_design: "Basic Design",
  api_design: "API Design",
  detail_design: "Detail Design",
  testcase_manual: "Testcase Manual",
  figma: "Figma",
};

function priorityTone(p: string) {
  const v = (p || "").toLowerCase();
  if (v === "critical" || v === "p0") return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  if (v === "high" || v === "p1") return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  if (v === "medium" || v === "p2") return "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900/60 dark:bg-yellow-950/40 dark:text-yellow-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
}

function statusTone(s: string) {
  const v = (s || "").toLowerCase();
  if (v === "active" || v === "passed")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (v === "failed")
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  if (v === "ready" || v === "draft")
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
}

function safeMarked(md: string) {
  // GFM: bảng, strikethrough, v.v. Typography plugin (`prose`) style các thẻ HTML sinh ra.
  return marked.parse(md || "", { gfm: true, breaks: true }) as string;
}

function errMessage(e: unknown): string {
  const ax = e as AxiosError<{ message?: string; error?: string }>;
  return ax.response?.data?.message || ax.response?.data?.error || ax.message || "Không thể tải dữ liệu.";
}

type SelectionTooltipState = {
  open: boolean;
  top: number;
  left: number;
  text: string;
  chunkId?: string;
};

function Toast({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{body}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
          aria-label="Close toast"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function DocumentViewerClient({
  projectId,
  projectName,
  docId,
  initialVersionId,
  initialChunkId,
}: {
  projectId?: string;
  projectName: string;
  docId: string;
  initialVersionId?: string;
  initialChunkId?: string;
}) {
  const [viewer, setViewer] = useState<DocumentViewerResponse | null>(null);
  const [versions, setVersions] = useState<ViewerVersionItem[]>([]);
  const [chunks, setChunks] = useState<ViewerChunk[]>([]);
  const [outline, setOutline] = useState<ChunkOutlineItem[]>([]);

  const [versionId, setVersionId] = useState<string | undefined>(initialVersionId);
  const [activeChunkId, setActiveChunkId] = useState<string>(initialChunkId ?? "");

  const citeChunkId = (initialChunkId ?? "").trim();
  const [showFullDocument, setShowFullDocument] = useState(() => !citeChunkId);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const expandFullDocument = useCallback(() => {
    setShowFullDocument(true);
    const qs = new URLSearchParams(searchParams.toString());
    qs.delete("chunkId");
    const q = qs.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chunkTcCache, setChunkTcCache] = useState<Record<string, ChunkTestcasesResponse>>({});
  const [chunkTcLoading, setChunkTcLoading] = useState(false);

  const related = useMemo(() => {
    if (!activeChunkId) return null;
    return chunkTcCache[activeChunkId] ?? null;
  }, [activeChunkId, chunkTcCache]);

  const [tooltip, setTooltip] = useState<SelectionTooltipState>({
    open: false,
    top: 0,
    left: 0,
    text: "",
  });

  const [tcPanelOpen, setTcPanelOpen] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [draft, setDraft] = useState<TcDraft | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);

  const loadViewer = useCallback(async (nextVersionId?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchDocumentViewer({
        documentId: docId,
        version_id: nextVersionId ?? versionId,
        include_tc_count: true,
      });
      setViewer(data);
      setVersions(data.all_versions);
      setChunks(data.chunks);

      const currentVid = data.version.id;
      setVersionId(currentVid);

      // outline is optional; use dedicated endpoint (spec) for future left navigator.
      try {
        const out = await fetchDocumentChunksOutline({ documentId: docId, version_id: currentVid });
        setOutline(out.chunks);
      } catch {
        setOutline([]);
      }

      // Ưu tiên chunk từ URL (trích dẫn chat), sau đó chunk đang chọn, cuối cùng chunk đầu.
      setActiveChunkId((prev) => {
        const fromUrl = (initialChunkId ?? "").trim();
        if (fromUrl && data.chunks.some((c) => c.id === fromUrl)) return fromUrl;
        if (prev && data.chunks.some((c) => c.id === prev)) return prev;
        return data.chunks[0]?.id ?? "";
      });
    } catch (e) {
      setLoadError(errMessage(e));
      setViewer(null);
      setVersions([]);
      setChunks([]);
      setOutline([]);
    } finally {
      setLoading(false);
    }
  }, [docId, versionId, initialChunkId]);

  useEffect(() => {
    let cancelled = false;
    // Defer async state updates to avoid sync setState in effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      void loadViewer(initialVersionId);
    });
    return () => {
      cancelled = true;
    };
  }, [loadViewer, initialVersionId]);

  const displayChunks = useMemo(() => {
    const all = chunks ?? [];
    if (showFullDocument) return all;
    const target = citeChunkId || activeChunkId;
    if (!target) return all;
    const hit = all.filter((c) => c.id === target);
    return hit.length > 0 ? hit : all;
  }, [chunks, showFullDocument, citeChunkId, activeChunkId]);

  useEffect(() => {
    if (showFullDocument || !citeChunkId) return;
    if (loading) return;
    const all = chunks ?? [];
    if (all.length === 0) return;
    if (!all.some((c) => c.id === citeChunkId)) {
      queueMicrotask(() => setShowFullDocument(true));
    }
  }, [citeChunkId, showFullDocument, loading, chunks]);

  // Scroll active chunk into view (e.g. từ Q&A / chế độ một chunk)
  useEffect(() => {
    if (!activeChunkId) return;
    const el = document.querySelector(`[data-chunk-id="${CSS.escape(activeChunkId)}"]`);
    if (!el) return;
    (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeChunkId, showFullDocument, displayChunks.length]);

  useEffect(() => {
    if (!activeChunkId) return;
    if (chunkTcCache[activeChunkId]) return;
    let cancelled = false;
    // Defer async state updates to avoid sync setState in effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      setChunkTcLoading(true);
      fetchChunkTestcases(activeChunkId)
        .then((data) => {
          if (cancelled) return;
          setChunkTcCache((m) => ({ ...m, [activeChunkId]: data }));
        })
        .catch(() => {})
        .finally(() => {
          if (cancelled) return;
          setChunkTcLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [activeChunkId, chunkTcCache]);

  function closeTooltip() {
    setTooltip((s) => ({ ...s, open: false, text: "" }));
  }

  function onMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return closeTooltip();
    const text = sel.toString().trim();
    if (!text) return closeTooltip();

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    if (!rect || rect.width === 0) return closeTooltip();

    const root = contentRef.current;
    const anchorNode = sel.anchorNode;
    if (!root || !anchorNode) return closeTooltip();
    if (!root.contains(anchorNode)) return closeTooltip();

    // Find chunk container
    let el: HTMLElement | null =
      anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement;
    while (el && el !== root && !el.dataset.chunkId) el = el.parentElement;
    const chunkId = el?.dataset.chunkId;
    if (chunkId) setActiveChunkId(chunkId);

    setTooltip({
      open: true,
      top: Math.max(12, rect.top + window.scrollY - 44),
      left: Math.min(window.innerWidth - 220, Math.max(12, rect.left + window.scrollX)),
      text,
      chunkId,
    });
    setSelectedText(text);
  }

  const backToDetail = projectId
    ? `/documents/${encodeURIComponent(docId)}?projectId=${encodeURIComponent(projectId)}`
    : `/documents/${encodeURIComponent(docId)}`;

  const chatHref = projectId
    ? `/chat?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(docId)}`
    : `/chat?docId=${encodeURIComponent(docId)}`;

  const tcEditorHrefBase = projectId
    ? `/testcases/editor?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(docId)}`
    : `/testcases/editor?docId=${encodeURIComponent(docId)}`;

  const figmaHref = viewer?.document.doc_type === "figma" ? viewer?.figma_frames?.[0]?.figma_url ?? undefined : undefined;

  const title = viewer
    ? `${viewer.document.screen_name} / ${docTypeLabel[viewer.document.doc_type] ?? viewer.document.doc_type}`
    : "Document viewer";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
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
            href={projectId ? `/documents?projectId=${encodeURIComponent(projectId)}` : "/documents"}
            className="font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            Documents
          </Link>{" "}
          <span aria-hidden className="mx-1">
            ›
          </span>
          <Link
            href={backToDetail}
            className="font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            {title}
          </Link>{" "}
          <span aria-hidden className="mx-1">
            ›
          </span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-50">Viewer</span>
        </nav>

        <div className="mt-4 sticky top-0 z-30 -mx-6 border-b border-zinc-200/70 bg-white/70 px-6 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                {title}
              </p>
              <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                {viewer?.document.project_id ? `Project: ${viewer.document.project_id}` : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Version
                </span>
                <select
                  value={versionId ?? ""}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setVersionId(nextId);
                    void loadViewer(nextId);
                  }}
                  disabled={loading || versions.length === 0}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_no}
                    </option>
                  ))}
                </select>
              </label>

              <Link
                href={chatHref}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
              >
                Hỏi AI về màn hình này
              </Link>

              {figmaHref ? (
                <Link
                  href={figmaHref}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Xem Figma frame
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-7">
            <div
              ref={contentRef}
              onMouseUp={onMouseUp}
              onMouseDown={() => closeTooltip()}
              className="rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40"
            >
              {citeChunkId && !showFullDocument && !loading && !loadError ? (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                  <p className="font-medium">Đang xem một chunk (từ trích dẫn). Có thể mở rộng để đọc toàn bộ tài liệu.</p>
                  <button
                    type="button"
                    onClick={() => expandFullDocument()}
                    className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm hover:bg-amber-50 dark:border-amber-800 dark:bg-zinc-900 dark:text-amber-100 dark:hover:bg-zinc-800"
                  >
                    Xem toàn bộ tài liệu
                  </button>
                </div>
              ) : null}
              <div className="prose prose-sm prose-zinc min-w-0 max-w-full prose-headings:scroll-mt-24 prose-pre:max-w-full prose-pre:overflow-x-auto prose-table:block prose-table:w-full prose-table:overflow-x-auto prose-table:text-sm prose-img:max-w-full dark:prose-invert">
                {loading ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Đang tải nội dung…</p>
                ) : loadError ? (
                  <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
                ) : (
                  displayChunks.map((c) => {
                    const active = c.id === activeChunkId;
                    const tcCount = c.tc_count ?? 0;
                    const section =
                      (c.metadata && typeof c.metadata.section === "string" ? (c.metadata.section as string) : undefined) ??
                      (outline.find((o) => o.id === c.id)?.section ?? undefined);
                  return (
                    <div
                      key={c.id}
                      data-chunk-id={c.id}
                      className={[
                        "group rounded-xl border-l-4 px-4 py-3 transition",
                        active
                          ? "border-l-amber-400 bg-amber-50/70"
                          : "border-l-zinc-200 hover:border-l-zinc-400 hover:bg-zinc-50/60 dark:border-l-zinc-800 dark:hover:border-l-zinc-600 dark:hover:bg-zinc-800/20",
                        active ? "dark:bg-amber-950/20" : "",
                      ].join(" ")}
                      onMouseEnter={() => {}}
                      onClick={() => setActiveChunkId(c.id)}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          Chunk #{c.chunk_index} {section ? `· ${section}` : ""} {tcCount > 0 ? `· ${tcCount} TC` : ""}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveChunkId(c.id);
                          }}
                          className="text-xs font-semibold text-violet-700 opacity-0 transition group-hover:opacity-100 dark:text-violet-300"
                        >
                          Select
                        </button>
                      </div>
                      <div
                        className="min-w-0 max-w-full overflow-x-auto [&_pre]:whitespace-pre [&_table]:min-w-0"
                        dangerouslySetInnerHTML={{ __html: safeMarked(c.content_text) }}
                      />
                    </div>
                  );
                })
                )}
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-5">
            <div className="sticky top-20 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Testcase liên quan
                </p>
                <span className="rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300">
                  {related?.total ?? 0}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {chunkTcLoading ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Đang tải testcase…</p>
                ) : !activeChunkId ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">Chưa chọn chunk.</p>
                ) : (related?.testcases?.length ?? 0) === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Chưa có testcase linked cho chunk đang chọn.
                  </p>
                ) : (
                  (related?.testcases ?? []).map((tc) => (
                    <div
                      key={tc.id}
                      className="rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {tc.title}
                          </p>
                          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            {tc.id}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-xs font-semibold",
                              priorityTone(tc.priority),
                            ].join(" ")}
                          >
                            {tc.priority}
                          </span>
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                              statusTone(tc.status),
                            ].join(" ")}
                          >
                            {tc.status}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href="/testcases"
                          className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                        >
                          Xem
                        </Link>
                        <Link
                          href={`${tcEditorHrefBase}&tcId=${encodeURIComponent(tc.id)}`}
                          className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                        >
                          Sửa
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
                <Link
                  href={`${tcEditorHrefBase}&source=screen`}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  + Tạo testcase mới từ màn hình này
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {tooltip.open ? (
        <div
          className="fixed z-60"
          style={{ top: tooltip.top, left: tooltip.left }}
          role="dialog"
          aria-label="Selection actions"
        >
          <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/95 px-2 py-2 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
            <button
              type="button"
              onClick={() => {
                closeTooltip();
                setTcPanelOpen(true);
              }}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/40"
            >
              Xem TC liên quan
            </button>
            <Link
              href={`${tcEditorHrefBase}&source=selection&chunkId=${encodeURIComponent(tooltip.chunkId ?? activeChunkId)}&text=${encodeURIComponent(tooltip.text)}`}
              onClick={() => closeTooltip()}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950/30"
            >
              Tạo TC từ đoạn này
            </Link>
            <Link
              href={`${chatHref}&chunkId=${encodeURIComponent(tooltip.chunkId ?? activeChunkId)}&q=${encodeURIComponent(tooltip.text)}`}
              onClick={() => closeTooltip()}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800/40"
            >
              Hỏi AI về đoạn này
            </Link>
          </div>
        </div>
      ) : null}

      {/* S11: TC panel (slide-in from right) */}
      {tcPanelOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            aria-hidden
            onClick={() => setTcPanelOpen(false)}
          />
          <aside className="fixed right-0 top-0 z-50 h-full w-[380px] max-w-[calc(100vw-32px)] border-l border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-4 py-4 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Testcase liên quan đến đoạn này
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Chunk: <span className="font-mono">{activeChunkId}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setTcPanelOpen(false)}
                  className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-auto px-4 py-4">
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="italic leading-relaxed">
                    {selectedText || "—"}
                  </p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    Đang linked
                  </p>
                  <div className="mt-2 space-y-2">
                    {(related?.testcases?.length ?? 0) === 0 ? (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Chưa có testcase nào linked
                      </p>
                    ) : (
                      (related?.testcases ?? []).map((tc) => (
                        <div
                          key={tc.id}
                          className="rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/10"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {tc.title}
                              </p>
                              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                {tc.id}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span
                                className={[
                                  "rounded-full border px-2 py-0.5 text-xs font-semibold",
                                  priorityTone(tc.priority),
                                ].join(" ")}
                              >
                                {tc.priority}
                              </span>
                              <span
                                className={[
                                  "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                  statusTone(tc.status),
                                ].join(" ")}
                              >
                                {tc.status}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3">
                            <Link
                              href={`${tcEditorHrefBase}&tcId=${encodeURIComponent(tc.id)}&source=chunk&chunkId=${encodeURIComponent(activeChunkId)}`}
                              className="text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                            >
                              Sửa chi tiết →
                            </Link>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      const seed = selectedText.trim().slice(0, 60);
                      setDraft({
                        title: seed ? `TC: ${seed}${selectedText.length > 60 ? "…" : ""}` : "TC mới",
                        steps: [
                          "Mở màn hình Login",
                          "Thực hiện thao tác theo đoạn mô tả",
                          "Quan sát kết quả",
                        ],
                        expected: "Kết quả đúng như spec/chunk đã chọn.",
                        priority: "High",
                        type: "Manual",
                      });
                    }}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
                  >
                    + Generate TC bằng AI
                  </button>
                </div>

                {draft ? (
                  <div className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/30">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      AI pre-fill (mock)
                    </p>

                    <label className="mt-3 block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Title
                      </span>
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft((d) => (d ? { ...d, title: e.target.value } : d))}
                        className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                      />
                    </label>

                    <div className="mt-3">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Steps
                      </span>
                      <div className="mt-2 space-y-2">
                        {draft.steps.map((s, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              value={s}
                              onChange={(e) =>
                                setDraft((d) =>
                                  d
                                    ? {
                                        ...d,
                                        steps: d.steps.map((x, i) => (i === idx ? e.target.value : x)),
                                      }
                                    : d,
                                )
                              }
                              className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((d) =>
                                  d ? { ...d, steps: d.steps.filter((_, i) => i !== idx) } : d,
                                )
                              }
                              className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                              aria-label="Remove step"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => (d ? { ...d, steps: [...d.steps, ""] } : d))
                          }
                          className="text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                        >
                          + Thêm bước
                        </button>
                      </div>
                    </div>

                    <label className="mt-3 block">
                      <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Expected result
                      </span>
                      <textarea
                        value={draft.expected}
                        onChange={(e) =>
                          setDraft((d) => (d ? { ...d, expected: e.target.value } : d))
                        }
                        className="mt-1 h-20 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                      />
                    </label>

                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Priority
                        </span>
                        <select
                          value={draft.priority}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, priority: e.target.value as TcDraft["priority"] } : d))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                        >
                          {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Type
                        </span>
                        <select
                          value={draft.type}
                          onChange={(e) =>
                            setDraft((d) => (d ? { ...d, type: e.target.value as TcDraft["type"] } : d))
                          }
                          className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                        >
                          {(["Manual", "API", "E2E"] as const).map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setDraft(null)}
                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                      >
                        Huỷ
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(null);
                          setToastOpen(true);
                          setTimeout(() => setToastOpen(false), 1200);
                        }}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 active:bg-emerald-700"
                      >
                        Lưu testcase
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setTcPanelOpen(false)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Đóng panel
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {toastOpen ? (
        <Toast
          title="Chưa triển khai"
          body="Chức năng tạo/link testcase sẽ được nối API ở bước tiếp theo."
          onClose={() => setToastOpen(false)}
        />
      ) : null}
    </div>
  );
}

