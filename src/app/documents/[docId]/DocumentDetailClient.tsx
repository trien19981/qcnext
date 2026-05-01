"use client";

import Link from "next/link";
import type { AxiosError } from "axios";
import { useEffect, useMemo, useState } from "react";
import { marked } from "marked";
import {
  fetchDocumentViewer,
  fetchDocumentVersions,
  type DocumentViewerResponse,
  type VersionDetail,
  type VersionsListResponse,
} from "@/features/documents";
import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";

type Role = "pm" | "qc" | "dev" | "admin";
type DocStatus = "draft" | "processing" | "ready_for_review" | "approved" | "rejected";

const docTypeLabel: Record<string, string> = {
  basic_design: "Basic Design",
  api_design: "API Design",
  detail_design: "Detail Design",
  testcase_manual: "Testcase Manual",
  figma: "Figma",
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

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300">
      {children}
    </span>
  );
}

function errMessage(e: unknown): string {
  const ax = e as AxiosError<{ message?: string; error?: string }>;
  return ax.response?.data?.message || ax.response?.data?.error || ax.message || "Không thể tải dữ liệu.";
}

function safeMarked(md: string) {
  // NOTE: v1 mock only. When wiring real user content, sanitize HTML output.
  return marked.parse(md, { breaks: true }) as string;
}

export function DocumentDetailClient({
  projectId,
  projectName,
  docId,
  initialRole,
}: {
  projectId?: string;
  projectName: string;
  docId: string;
  initialRole: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);
  const canManage = role === "pm" || role === "admin";

  const [versionsResp, setVersionsResp] = useState<VersionsListResponse | null>(null);
  const versions = useMemo<VersionDetail[]>(() => {
    const v = versionsResp?.versions ?? [];
    return [...v].sort((a, b) => b.version_no - a.version_no);
  }, [versionsResp]);

  const [selectedVersionId, setSelectedVersionId] = useState<string>("");
  const selectedVersion = useMemo(() => versions.find((v) => v.id === selectedVersionId) ?? versions[0], [versions, selectedVersionId]);
  const prevVersion = useMemo(() => {
    if (!selectedVersion) return undefined;
    const idx = versions.findIndex((v) => v.id === selectedVersion.id);
    return idx >= 0 ? versions[idx + 1] : undefined;
  }, [versions, selectedVersion]);

  const [viewer, setViewer] = useState<DocumentViewerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [rightTab, setRightTab] = useState<"chunks" | "testcases">("chunks");
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);

  const chunks = useMemo(() => viewer?.chunks ?? [], [viewer]);
  const selectedChunk = useMemo(
    () => (selectedChunkId ? chunks.find((c) => c.id === selectedChunkId) ?? null : null),
    [chunks, selectedChunkId],
  );
  const highlightedText = useMemo(() => {
    if (!selectedChunkId) return "";
    return chunks.find((c) => c.id === selectedChunkId)?.content_text ?? "";
  }, [chunks, selectedChunkId]);

  const docTitle = useMemo(() => {
    const screen = versionsResp?.screen_name ?? "—";
    const dt = versionsResp?.doc_type ?? "—";
    return `${screen} · ${docTypeLabel[dt] ?? dt}`;
  }, [versionsResp]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setLoadError(null);
      fetchDocumentVersions(docId)
        .then((data) => {
          if (cancelled) return;
          setVersionsResp(data);
          const first = [...data.versions].sort((a, b) => b.version_no - a.version_no)[0];
          setSelectedVersionId(first?.id ?? "");
        })
        .catch((e) => {
          if (cancelled) return;
          setLoadError(errMessage(e));
          setVersionsResp(null);
          setSelectedVersionId("");
        })
        .finally(() => {
          if (cancelled) return;
          setLoading(false);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [docId]);

  useEffect(() => {
    if (!selectedVersionId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      fetchDocumentViewer({ documentId: docId, version_id: selectedVersionId, include_tc_count: true })
        .then((data) => {
          if (cancelled) return;
          setViewer(data);
          setSelectedChunkId((prev) => {
            if (prev && data.chunks.some((c) => c.id === prev)) return prev;
            return data.chunks[0]?.id ?? null;
          });
        })
        .catch(() => {
          if (cancelled) return;
          setViewer(null);
          setSelectedChunkId(null);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [docId, selectedVersionId]);

  const backToDocuments = projectId
    ? `/documents?projectId=${encodeURIComponent(projectId)}`
    : "/documents";

  const uploadHref = projectId
    ? `/documents/upload?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(docId)}`
    : `/documents/upload?docId=${encodeURIComponent(docId)}`;

  const diffHref =
    projectId && prevVersion
      ? `/diff-review?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(docId)}&from=${encodeURIComponent(prevVersion.id)}&to=${encodeURIComponent(selectedVersion?.id ?? "")}`
      : `/diff-review?docId=${encodeURIComponent(docId)}`;

  const viewerHref = projectId
    ? `/documents/${encodeURIComponent(docId)}/viewer?projectId=${encodeURIComponent(projectId)}`
    : `/documents/${encodeURIComponent(docId)}/viewer`;

  const tcListHref = "/testcases";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
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
              href={backToDocuments}
              className="font-semibold text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50"
            >
              Documents
            </Link>{" "}
            <span aria-hidden className="mx-1">
              ›
            </span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-50">{docTitle}</span>
          </nav>

          <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/40">
            {(["pm", "qc", "dev", "admin"] as const).map((r) => {
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

        <header className="mt-4 rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                {docTitle}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill>{versionsResp?.doc_type ? docTypeLabel[versionsResp.doc_type] ?? versionsResp.doc_type : "—"}</Pill>
                <Pill>{versionsResp?.screen_name ?? "—"}</Pill>
                {selectedVersion ? <StatusBadge status={selectedVersion.status as DocStatus} /> : null}
              </div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {loadError ? loadError : selectedVersion ? `Chunks: ${selectedVersion.chunk_count}` : loading ? "Đang tải…" : ""}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  Version
                </span>
                <select
                  value={selectedVersionId}
                  onChange={(e) => {
                    setSelectedVersionId(e.target.value);
                    setSelectedChunkId(null);
                  }}
                  disabled={loading || versions.length === 0}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version_no} · {String(v.status)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={async () => {
                  if (!selectedVersion) return;
                  const { data } = await axios.get(endpoints.documents.downloadVersion(docId, selectedVersion.id));
                  const url = (data as { download_url: string }).download_url;
                  window.open(url, "_blank", "noopener,noreferrer");
                }}
                disabled={!selectedVersion}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                title="Download từ R2"
              >
                Xem file gốc
              </button>

              {canManage ? (
                <Link
                  href={diffHref}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  So sánh với version trước
                </Link>
              ) : null}
            </div>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-12 gap-6">
          <section className="col-span-12 lg:col-span-8">
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Changelog
                  </p>
                  <Link
                    href={`${viewerHref}${selectedVersion ? `&v=${encodeURIComponent(selectedVersion.id)}` : ""}`}
                    className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
                  >
                    Xem nội dung →
                  </Link>
                </div>
                <div
                  className="prose prose-zinc mt-3 max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{
                    __html: safeMarked(selectedVersion?.changelog_md ?? ""),
                  }}
                />
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Nội dung
                  </p>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    Chọn chunk bên phải để xem nội dung
                  </p>
                </div>

                {!selectedChunk ? (
                  <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
                    Chưa chọn chunk.
                  </p>
                ) : (
                  <div className="mt-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        Chunk #{selectedChunk.chunk_index}
                        {typeof selectedChunk.metadata?.section === "string" ? ` · ${selectedChunk.metadata.section}` : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => setRightTab("chunks")}
                        className="text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                      >
                        Xem danh sách chunks →
                      </button>
                    </div>
                    <div
                      className="prose prose-zinc max-w-none leading-relaxed dark:prose-invert"
                      dangerouslySetInnerHTML={{ __html: safeMarked(selectedChunk.content_text) }}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRightTab("chunks")}
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-semibold transition",
                      rightTab === "chunks"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30",
                    ].join(" ")}
                  >
                    Chunks
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightTab("testcases")}
                    className={[
                      "rounded-lg px-3 py-2 text-sm font-semibold transition",
                      rightTab === "testcases"
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30",
                    ].join(" ")}
                  >
                    Testcases
                  </button>
                </div>

                {rightTab === "chunks" ? (
                  <div className="mt-4 space-y-2">
                    {(chunks ?? []).map((c) => {
                      const active = c.id === selectedChunkId;
                      const raw = c.content_text || "";
                      const preview = raw.length > 80 ? `${raw.slice(0, 80)}…` : raw;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedChunkId(c.id)}
                          className={[
                            "w-full rounded-xl border px-3 py-3 text-left transition",
                            active
                              ? "border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30"
                              : "border-zinc-200 bg-white/60 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 dark:hover:bg-zinc-800/30",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                              #{c.chunk_index}
                            </span>
                            <span className="rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300">
                              {typeof c.metadata?.section === "string" ? c.metadata.section : "chunk"}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{preview}</p>
                        </button>
                      );
                    })}
                    {highlightedText ? (
                      <div className="mt-3 rounded-xl border border-zinc-200 bg-white/60 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/10 dark:text-zinc-300">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                          Selected chunk
                        </p>
                        <p className="mt-2">{highlightedText}</p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <Link
                      href={tcListHref}
                      className="mt-2 inline-flex text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
                    >
                      Mở danh sách testcase (đang mock ở màn này) →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {canManage ? (
          <Link
            href={uploadHref}
            className="fixed bottom-6 right-6 z-40 inline-flex items-center justify-center rounded-full bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-violet-500 active:bg-violet-700"
          >
            Upload version mới
          </Link>
        ) : null}
      </div>
    </div>
  );
}

