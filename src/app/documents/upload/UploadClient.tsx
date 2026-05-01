"use client";

import Link from "next/link";
import type { AxiosError } from "axios";
import { uploadDocumentVersion, uploadNewDocument } from "@/features/documents";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "pm" | "admin" | "qc" | "dev";

type ScreenKey = "login" | "dashboard" | "documents" | "diff_viewer" | "chat" | "custom";

type DocType = "basic_design" | "api_design" | "detail_design" | "testcase_manual" | "figma";

const screenLabel: Record<Exclude<ScreenKey, "custom">, string> = {
  login: "Login",
  dashboard: "Dashboard",
  documents: "Documents",
  diff_viewer: "Diff Viewer",
  chat: "Chat",
};

const docTypeLabel: Record<DocType, string> = {
  basic_design: "Basic Design",
  api_design: "API Design",
  detail_design: "Detail Design",
  testcase_manual: "Testcase Manual",
  figma: "Figma",
};

const changelogTemplate = `## Summary
- What changed?

## Impact
- Affected screens/modules:
- Backward compatibility:

## Test notes
- Key scenarios to re-test:
`;

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"] as const;
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function readCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

function Toast({
  title,
  body,
  action,
  onClose,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
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
      {action ? <div className="border-t border-zinc-200/70 px-4 py-3 dark:border-zinc-800">{action}</div> : null}
    </div>
  );
}

export function UploadClient({
  projectId,
  docId,
}: {
  projectId?: string;
  docId?: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const cancelledRef = useRef(false);
  const submittingRef = useRef(false);

  const [role, setRole] = useState<Role>(() => {
    const c = readCookie("qc_role")?.toLowerCase();
    if (c === "admin") return "admin";
    if (c === "pm/ba" || c === "pm") return "pm";
    if (c === "qc/tester" || c === "qc") return "qc";
    return "dev";
  });

  const canUpload = role === "pm" || role === "admin";

  const [screen, setScreen] = useState<ScreenKey>("login");
  const [customScreen, setCustomScreen] = useState("");
  const [docType, setDocType] = useState<DocType>("basic_design");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [changelog, setChangelog] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [backendProcessing, setBackendProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastTitle, setToastTitle] = useState("Upload thành công");
  const [toastBody, setToastBody] = useState("Đang xử lý...");
  const [createdDocId, setCreatedDocId] = useState<string | undefined>(docId);

  const title = docId ? "Upload version mới" : "Upload tài liệu mới";
  const backHref = projectId ? `/documents?projectId=${encodeURIComponent(projectId)}` : "/documents";

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const screenName = useMemo(() => {
    if (screen !== "custom") return screenLabel[screen];
    return customScreen.trim() || "Custom";
  }, [screen, customScreen]);

  /** Pipeline chỉ extract Markdown; API cũng chỉ chấp nhận `.md`. */
  const fileAccept = ".md";

  function getErrorMessage(e: unknown) {
    const ax = e as AxiosError<{ message?: string; error?: string }>;
    return ax.response?.data?.message || ax.response?.data?.error || ax.message || "Upload thất bại";
  }

  function isMarkdownFilename(name: string) {
    return name.trim().toLowerCase().endsWith(".md");
  }

  function onPickFile(f?: File | null) {
    if (!f) return;
    if (!isMarkdownFilename(f.name)) {
      setToastTitle("File không hợp lệ");
      setToastBody("Chỉ chấp nhận file Markdown (.md).");
      setToastOpen(true);
      return;
    }
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    onPickFile(f);
  }

  function closeModal() {
    if (submittingRef.current) return;
    router.replace(backHref);
  }

  /** Đóng modal sau upload thành công — không chặn bởi `submittingRef` (đã xong request). */
  function leaveUploadModal() {
    router.replace(backHref);
  }

  async function onSubmit() {
    if (!canUpload || submitting) return;
    if (!file) return;
    if (!isMarkdownFilename(file.name)) {
      setToastTitle("File không hợp lệ");
      setToastBody("Chỉ chấp nhận file Markdown (.md).");
      setToastOpen(true);
      return;
    }

    const changelogTrim = changelog.trim();
    const isVersionUpload = !!docId;

    if (!isVersionUpload && screen === "custom" && !customScreen.trim()) return;

    if (isVersionUpload && changelogTrim.length < 10) return;
    if (!projectId && !isVersionUpload) {
      setToastTitle("Upload thất bại");
      setToastBody("Không tìm thấy projectId.");
      setToastOpen(true);
      return;
    }

    setToastOpen(false);
    setToastTitle("Upload thành công");
    setToastBody("Đang xử lý...");
    setUploadProgress(0);
    setBackendProcessing(false);

    setSubmitting(true);
    try {
      if (!isVersionUpload) {
        const res = await uploadNewDocument({
          projectId: projectId!,
          screen_name: screenName,
          doc_type: docType,
          file,
          changelog_md: changelogTrim || undefined,
          onUploadProgress: setUploadProgress,
        });
        if (cancelledRef.current) return;
        setCreatedDocId(res.document.id);
        setBackendProcessing(true);
        setToastTitle("Upload tài liệu thành công");
        setToastBody(res.message || "Đang xử lý...");
      } else {
        const res = await uploadDocumentVersion({
          documentId: docId!,
          file,
          changelog_md: changelogTrim,
          onUploadProgress: setUploadProgress,
        });
        if (cancelledRef.current) return;
        setBackendProcessing(true);
        setToastTitle("Upload version thành công");
        setToastBody(res.message || "Đang xử lý...");
      }

      setToastOpen(true);
      leaveUploadModal();
    } catch (e) {
      setToastTitle("Upload thất bại");
      setToastBody(getErrorMessage(e));
      setToastOpen(true);
    } finally {
      if (!cancelledRef.current) setSubmitting(false);
    }
  }

  const viewVersionHref = useMemo(() => {
    const id = createdDocId ?? docId;
    if (!id) return undefined;
    return projectId
      ? `/documents/${encodeURIComponent(id)}?projectId=${encodeURIComponent(projectId)}`
      : `/documents/${encodeURIComponent(id)}`;
  }, [createdDocId, docId, projectId]);

  const disableUpload =
    (() => {
      const changelogTrim = changelog.trim();
      const isVersionUpload = !!docId;
      const fileTooLarge = file ? file.size > 50 * 1024 * 1024 : false;
      const fileOkMd = file ? isMarkdownFilename(file.name) : false;
      return (
        !canUpload ||
        submitting ||
        backendProcessing ||
        !file ||
        !fileOkMd ||
        fileTooLarge ||
        (!isVersionUpload && screen === "custom" && customScreen.trim().length === 0) ||
        (isVersionUpload && changelogTrim.length < 10)
      );
    })();

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" aria-hidden />

      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 py-10">
        <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="max-h-[70vh] overflow-auto px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Project: <span className="font-mono">{projectId ?? "—"}</span>{" "}
                {docId ? (
                  <>
                    · docId: <span className="font-mono">{docId}</span>
                  </>
                ) : null}
              </p>
              <div className="inline-flex overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/20">
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

            {!canUpload ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                Chỉ PM/Admin mới có quyền upload.
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Màn hình
                </span>
                <select
                  value={screen}
                  onChange={(e) => setScreen(e.target.value as ScreenKey)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={submitting}
                >
                  {(["login", "dashboard", "documents", "diff_viewer", "chat"] as const).map((s) => (
                    <option key={s} value={s}>
                      {screenLabel[s]}
                    </option>
                  ))}
                  <option value="custom">Nhập tên mới…</option>
                </select>
                {screen === "custom" ? (
                  <input
                    value={customScreen}
                    onChange={(e) => setCustomScreen(e.target.value)}
                    placeholder="Ví dụ: Payment"
                    className="mt-2 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    disabled={submitting}
                  />
                ) : null}
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Loại tài liệu
                </span>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocType)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={submitting}
                >
                  {(["basic_design", "api_design", "detail_design", "testcase_manual"] as const).map(
                    (t) => (
                      <option key={t} value={t}>
                        {docTypeLabel[t]}
                      </option>
                    ),
                  )}
                  <option value="figma" disabled>
                    {docTypeLabel.figma} (sync tự động)
                  </option>
                </select>
              </label>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">File</p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={[
                  "mt-2 rounded-2xl border-2 border-dashed p-6 text-center transition",
                  dragOver
                    ? "border-violet-400 bg-violet-50/60 dark:bg-violet-950/20"
                    : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/20",
                ].join(" ")}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white">
                  ⬆
                </div>
                <p className="mt-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Kéo thả hoặc click để chọn
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Accept: {fileAccept}
                </p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-4 inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                  disabled={submitting}
                >
                  Chọn file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept={fileAccept}
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
              </div>

              {file ? (
                <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/20">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
                    disabled={submitting}
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ) : null}
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Ghi chú thay đổi (changelog)
                </p>
                <button
                  type="button"
                  onClick={() => setShowTemplate((v) => !v)}
                  className="text-xs font-semibold text-violet-700 hover:underline dark:text-violet-300"
                  disabled={submitting}
                >
                  Xem mẫu chuẩn
                </button>
              </div>
              {showTemplate ? (
                <div className="mt-2 rounded-xl border border-zinc-200 bg-white/70 p-3 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/20 dark:text-zinc-300">
                  <pre className="whitespace-pre-wrap font-mono">{changelogTemplate}</pre>
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setChangelog(changelogTemplate);
                        setShowTemplate(false);
                      }}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                      disabled={submitting}
                    >
                      Dùng template
                    </button>
                  </div>
                </div>
              ) : null}
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Mô tả thay đổi so với version trước..."
                className="mt-2 h-28 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <Link
              href={backHref}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
              aria-disabled={submitting}
              tabIndex={submitting ? -1 : 0}
              onClick={(e) => {
                if (submitting) e.preventDefault();
              }}
            >
              Huỷ
            </Link>

            <button
              type="button"
              onClick={onSubmit}
              disabled={disableUpload}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                disableUpload
                  ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700",
              ].join(" ")}
            >
              {submitting ? (
                <>
                  <Spinner />
                  Đang tải lên{uploadProgress ? `... ${uploadProgress}%` : "..."}...
                </>
              ) : backendProcessing ? (
                <>
                  <Spinner />
                  Đang xử lý...
                </>
              ) : (
                "Upload"
              )}
            </button>
          </div>
        </div>
      </div>

      {toastOpen ? (
        <Toast
          title={toastTitle}
          body={toastBody}
          onClose={() => setToastOpen(false)}
          action={
            viewVersionHref ? (
              <Link
                href={viewVersionHref}
                className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
              >
                Xem version
              </Link>
            ) : null
          }
        />
      ) : null}
    </>
  );
}

