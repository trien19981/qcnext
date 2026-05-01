"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ScreenKey = "login" | "dashboard" | "documents" | "diff_viewer" | "chat";
type TcType = "Manual" | "API" | "E2E";
type TcPriority = "Low" | "Medium" | "High" | "Critical";

type LinkedChunk = {
  docId: string;
  chunkId: string;
  kind: "spec" | "ui" | "api" | "rule";
  preview: string;
};

type ToastState = { open: boolean; title: string; body: string };

const screenLabel: Record<ScreenKey, string> = {
  login: "Login",
  dashboard: "Dashboard",
  documents: "Documents",
  diff_viewer: "Diff Viewer",
  chat: "Chat",
};

function kindTone(kind: LinkedChunk["kind"]) {
  if (kind === "api")
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
  if (kind === "rule")
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  if (kind === "ui")
    return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
}

function Toast({ state, onClose }: { state: ToastState; onClose: () => void }) {
  if (!state.open) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{state.title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{state.body}</p>
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

function ConfirmModal({
  title,
  body,
  confirmText,
  tone,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmText: string;
  tone: "danger" | "primary";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const confirmClass =
    tone === "danger"
      ? "bg-red-600 hover:bg-red-500 active:bg-red-700"
      : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 py-10">
        <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">{body}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className={["rounded-lg px-4 py-2 text-sm font-semibold text-white transition", confirmClass].join(" ")}
              >
                {confirmText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function LinkChunkModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: LinkedChunk) => void;
}) {
  const options: LinkedChunk[] = [
    {
      docId: "doc_login_basic",
      chunkId: "c2",
      kind: "rule",
      preview: "After login: detect role and redirect thẳng đến Project List.",
    },
    {
      docId: "doc_login_basic",
      chunkId: "c3",
      kind: "ui",
      preview: "Error state: border đỏ + message 'Email hoặc mật khẩu không đúng' dưới form.",
    },
    {
      docId: "doc_login_api",
      chunkId: "c1",
      kind: "api",
      preview: "Auth API endpoints: /login, /refresh, /logout…",
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" aria-hidden onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 py-10">
        <div className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Link chunk khác</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              (Mock) Search/suggest chunk theo screen/doc type.
            </p>
            <div className="mt-4 space-y-2">
              {options.map((c) => (
                <button
                  key={`${c.docId}_${c.chunkId}`}
                  type="button"
                  onClick={() => {
                    onPick(c);
                    onClose();
                  }}
                  className="w-full rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 dark:hover:bg-zinc-800/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {c.preview.length > 70 ? `${c.preview.slice(0, 70)}…` : c.preview}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                        {c.docId} · {c.chunkId}
                      </p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        kindTone(c.kind),
                      ].join(" ")}
                    >
                      {c.kind}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function clampPreview(s: string) {
  const t = s.trim().replaceAll(/\s+/g, " ");
  return t.length > 120 ? `${t.slice(0, 120)}…` : t;
}

export function TestcaseEditorClient({
  projectId,
  docId,
  tcId,
  chunkId,
  text,
  source,
}: {
  projectId?: string;
  docId?: string;
  tcId?: string;
  chunkId?: string;
  text?: string;
  source?: string;
}) {
  const router = useRouter();
  const isEdit = !!tcId;

  const initial = useMemo(() => {
    if (isEdit) {
      return {
        title: `Chỉnh sửa ${tcId}`,
        tcTitle: "Login success redirects to Project List",
        screen: "login" as ScreenKey,
        type: "Manual" as TcType,
        priority: "Critical" as TcPriority,
        steps: ["Mở màn Login", "Nhập email/password hợp lệ", "Bấm Đăng nhập"],
        expected: "Redirect thẳng vào Project List theo role.",
        note: "",
      };
    }
    const seedTitle = text ? `TC: ${clampPreview(text)}` : "TC mới";
    return {
      title: "Tạo testcase mới",
      tcTitle: seedTitle,
      screen: "login" as ScreenKey,
      type: "Manual" as TcType,
      priority: "High" as TcPriority,
      steps: ["Mở màn hình", "Thực hiện thao tác", "Quan sát kết quả"],
      expected: "Kết quả đúng như spec.",
      note: "",
    };
  }, [isEdit, tcId, text]);

  const [tcTitle, setTcTitle] = useState(initial.tcTitle);
  const [screen, setScreen] = useState<ScreenKey>(initial.screen);
  const [type, setType] = useState<TcType>(initial.type);
  const [priority, setPriority] = useState<TcPriority>(initial.priority);
  const [steps, setSteps] = useState<string[]>(initial.steps);
  const [expected, setExpected] = useState(initial.expected);
  const [note, setNote] = useState(initial.note);

  const [linkedChunks, setLinkedChunks] = useState<LinkedChunk[]>(() => {
    if (docId && chunkId) {
      return [
        {
          docId,
          chunkId,
          kind: "spec",
          preview: clampPreview(text ?? "Chunk nguồn từ Doc viewer."),
        },
      ];
    }
    return [];
  });

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>({ open: false, title: "", body: "" });
  const [confirm, setConfirm] = useState<null | { kind: "ai" | "delete" }>(null);
  const [linkOpen, setLinkOpen] = useState(false);

  const backHref = useMemo(() => {
    // Prefer going back to where user came from
    if (source === "selection" || source === "chunk") {
      if (docId) {
        const qs = new URLSearchParams();
        if (projectId) qs.set("projectId", projectId);
        if (chunkId) qs.set("chunkId", chunkId);
        return `/documents/${encodeURIComponent(docId)}/viewer?${qs.toString()}`;
      }
    }
    if (projectId) return `/testcases?projectId=${encodeURIComponent(projectId)}`;
    return "/testcases";
  }, [source, docId, projectId, chunkId]);

  const viewerHrefForChunk = (c: LinkedChunk) => {
    const qs = new URLSearchParams();
    if (projectId) qs.set("projectId", projectId);
    if (c.chunkId) qs.set("chunkId", c.chunkId);
    return `/documents/${encodeURIComponent(c.docId)}/viewer?${qs.toString()}`;
  };

  function moveStep(from: number, to: number) {
    if (to < 0 || to >= steps.length) return;
    const next = [...steps];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setSteps(next);
  }

  async function onSave() {
    if (!tcTitle.trim() || !expected.trim()) {
      setToast({ open: true, title: "Thiếu thông tin", body: "Vui lòng nhập Tiêu đề và Kết quả mong đợi." });
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setToast({ open: true, title: "Lưu thành công", body: "Testcase đã được cập nhật." });
    setTimeout(() => router.replace(backHref), 800);
  }

  async function onAiGenerateReplaceAll() {
    setConfirm(null);
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setSaving(false);
    setTcTitle("AI: Verify login redirect + error state");
    setSteps([
      "Mở màn Login",
      "Nhập email/password theo case",
      "Bấm Đăng nhập",
      "Xác minh redirect hoặc error state",
    ]);
    setExpected("Hành vi khớp spec/chunk nguồn; không có lỗi UI.");
    setNote("Generated by AI (mock).");
    setToast({ open: true, title: "AI generate xong", body: "Đã replace nội dung testcase." });
  }

  async function onDelete() {
    setConfirm(null);
    setSaving(true);
    await new Promise((r) => setTimeout(r, 700));
    setSaving(false);
    setToast({ open: true, title: "Đã xoá", body: "Testcase đã được xoá (mock)." });
    setTimeout(() => router.replace(backHref), 800);
  }

  const pageTitle = isEdit ? `Chỉnh sửa ${tcId}` : "Tạo testcase mới";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{pageTitle}</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {projectId ? `Project: ${projectId}` : "Project: —"}
              {source ? ` · source: ${source}` : ""}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirm({ kind: "ai" })}
              className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
              disabled={saving}
            >
              AI generate lại
            </button>
            <Link
              href={backHref}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
              aria-disabled={saving}
              tabIndex={saving ? -1 : 0}
              onClick={(e) => {
                if (saving) e.preventDefault();
              }}
            >
              Huỷ
            </Link>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* Left: form */}
          <section className="col-span-12 lg:col-span-8">
            <div className="rounded-2xl border border-zinc-200 bg-white/70 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Tiêu đề <span className="text-red-600">*</span>
                </span>
                <input
                  value={tcTitle}
                  onChange={(e) => setTcTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={saving}
                />
              </label>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Màn hình
                  </span>
                  <select
                    value={screen}
                    onChange={(e) => setScreen(e.target.value as ScreenKey)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    disabled={saving}
                  >
                    {(Object.keys(screenLabel) as ScreenKey[]).map((s) => (
                      <option key={s} value={s}>
                        {screenLabel[s]}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Loại
                    </span>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as TcType)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                      disabled={saving}
                    >
                      {(["Manual", "API", "E2E"] as const).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Priority
                    </span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as TcPriority)}
                      className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                      disabled={saving}
                    >
                      {(["Low", "Medium", "High", "Critical"] as const).map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Các bước thực hiện
                  </p>
                  <button
                    type="button"
                    onClick={() => setSteps((s) => [...s, ""])}
                    className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
                    disabled={saving}
                  >
                    + Thêm bước
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {steps.map((s, idx) => (
                    <div
                      key={idx}
                      draggable={!saving}
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex === null || dragIndex === idx) return;
                        moveStep(dragIndex, idx);
                        setDragIndex(null);
                      }}
                      className="rounded-2xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          Step {idx + 1} <span className="ml-2">(drag để reorder)</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveStep(idx, idx - 1)}
                            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                            disabled={saving}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveStep(idx, idx + 1)}
                            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                            disabled={saving}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => setSteps((arr) => arr.filter((_, i) => i !== idx))}
                            className="rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                            disabled={saving}
                            aria-label="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={s}
                        onChange={(e) =>
                          setSteps((arr) => arr.map((x, i) => (i === idx ? e.target.value : x)))
                        }
                        className="mt-2 h-20 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <label className="mt-5 block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Kết quả mong đợi <span className="text-red-600">*</span>
                </span>
                <textarea
                  value={expected}
                  onChange={(e) => setExpected(e.target.value)}
                  className="mt-1 h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={saving}
                />
              </label>

              <label className="mt-4 block">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Ghi chú</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="mt-1 h-20 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                  disabled={saving}
                />
              </label>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setConfirm({ kind: "delete" })}
                  className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  disabled={!isEdit || saving}
                >
                  Xoá testcase
                </button>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={backHref}
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                    aria-disabled={saving}
                    tabIndex={saving ? -1 : 0}
                    onClick={(e) => {
                      if (saving) e.preventDefault();
                    }}
                  >
                    Huỷ
                  </Link>
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className={[
                      "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                      saving
                        ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700",
                    ].join(" ")}
                  >
                    {saving ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Right: chunk panel */}
          <aside className="col-span-12 lg:col-span-4">
            <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Chunk tài liệu liên quan
                  </p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {linkedChunks.length} linked
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLinkOpen(true)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                  disabled={saving}
                >
                  + Link chunk khác
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {linkedChunks.length === 0 ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Chưa link chunk nào. Hãy link để AI generate chính xác hơn.
                  </p>
                ) : (
                  linkedChunks.map((c) => (
                    <div
                      key={`${c.docId}_${c.chunkId}`}
                      className="rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <a
                            href={viewerHrefForChunk(c)}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                            title="Open in Doc viewer"
                          >
                            {c.docId} · {c.chunkId}
                          </a>
                          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                            {c.preview}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={[
                              "rounded-full border px-2 py-0.5 text-xs font-semibold",
                              kindTone(c.kind),
                            ].join(" ")}
                          >
                            {c.kind}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setLinkedChunks((arr) =>
                                arr.filter((x) => !(x.docId === c.docId && x.chunkId === c.chunkId)),
                              )
                            }
                            className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
                            disabled={saving}
                            aria-label="Unlink"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {linkOpen ? (
        <LinkChunkModal
          onClose={() => setLinkOpen(false)}
          onPick={(c) => {
            setLinkedChunks((arr) => {
              const exists = arr.some((x) => x.docId === c.docId && x.chunkId === c.chunkId);
              return exists ? arr : [c, ...arr];
            });
          }}
        />
      ) : null}

      {confirm?.kind === "ai" ? (
        <ConfirmModal
          title="AI generate lại"
          body="AI sẽ replace toàn bộ nội dung testcase dựa trên context chunk. Bạn có chắc muốn tiếp tục?"
          confirmText="Generate"
          tone="primary"
          onCancel={() => setConfirm(null)}
          onConfirm={onAiGenerateReplaceAll}
        />
      ) : null}

      {confirm?.kind === "delete" ? (
        <ConfirmModal
          title="Xoá testcase"
          body="Bạn có chắc muốn xoá testcase này? Thao tác này không thể hoàn tác (mock)."
          confirmText="Xoá"
          tone="danger"
          onCancel={() => setConfirm(null)}
          onConfirm={onDelete}
        />
      ) : null}

      <Toast state={toast} onClose={() => setToast((s) => ({ ...s, open: false }))} />
    </div>
  );
}

