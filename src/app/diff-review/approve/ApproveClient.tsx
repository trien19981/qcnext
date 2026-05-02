"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { submitDiffReview } from "@/features/diff-viewer/api";

type ChangeKind = "add" | "delete" | "edit";

type ApprovedItem = {
  id: string;
  kind: ChangeKind;
  preview: string;
};

function kindLabel(k: ChangeKind) {
  if (k === "add") return "Thêm";
  if (k === "delete") return "Xoá";
  return "Sửa";
}

function kindTone(k: ChangeKind) {
  if (k === "add")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200";
  if (k === "delete")
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200";
  return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200";
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
  onClose,
  action,
}: {
  title: string;
  body: string;
  onClose: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] overflow-hidden rounded-2xl border border-zinc-200 bg-white/90 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/60">
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
      {action ? (
        <div className="border-t border-zinc-200/70 px-4 py-3 dark:border-zinc-800">{action}</div>
      ) : null}
    </div>
  );
}

function buildApprovedList(mode?: string): ApprovedItem[] {
  const all: ApprovedItem[] = [
    {
      id: "chg_1",
      kind: "edit",
      preview: "After login: detect role and redirect to Project List.",
    },
    {
      id: "chg_2",
      kind: "edit",
      preview: "Message: 'Email hoặc mật khẩu không đúng' dưới form.",
    },
    {
      id: "chg_3",
      kind: "add",
      preview: "Input Password có icon show/hide bên phải.",
    },
    {
      id: "chg_4",
      kind: "delete",
      preview: "Có sidebar ở màn Login.",
    },
    {
      id: "chg_5",
      kind: "edit",
      preview: "Centered card 400px.",
    },
  ];

  // Mock: if selected mode, show 3/5 changes
  if (mode === "selected") return all.slice(0, 3);
  return all;
}

export function ApproveClient({
  projectId,
  docId,
  from,
  to,
  mode,
  diffReviewId,
}: {
  projectId?: string;
  docId?: string;
  from?: string;
  to?: string;
  mode?: string;
  diffReviewId?: string;
}) {
  const router = useRouter();

  const items = useMemo(() => buildApprovedList(mode), [mode]);
  const toLabel = to ?? "Version mới";

  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);

  const backToDiff = projectId
    ? `/diff-review?projectId=${encodeURIComponent(projectId)}${docId ? `&docId=${encodeURIComponent(docId)}` : ""}${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}`
    : `/diff-review${docId ? `?docId=${encodeURIComponent(docId)}${from ? `&from=${encodeURIComponent(from)}` : ""}${to ? `&to=${encodeURIComponent(to)}` : ""}` : ""}`;

  const backToS5 =
    docId && projectId
      ? `/documents/${encodeURIComponent(docId)}?projectId=${encodeURIComponent(projectId)}`
      : docId
        ? `/documents/${encodeURIComponent(docId)}`
        : projectId
          ? `/documents?projectId=${encodeURIComponent(projectId)}`
          : "/documents";

  async function onConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (diffReviewId) {
        await submitDiffReview(diffReviewId, { review_note: note.trim() || undefined });
      }
      setToastOpen(true);
      setTimeout(() => {
        router.replace(backToS5);
      }, 900);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" aria-hidden />
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto px-4 py-10">
        <div className="w-full max-w-[520px] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <div className="border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Xác nhận approve thay đổi
            </p>
          </div>

          <div className="max-h-[70vh] overflow-auto px-5 py-5">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Bạn đang approve {items.length} thay đổi trong {toLabel}
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              (Mock) Sau khi approve, hệ thống sẽ re-embed các chunk liên quan.
            </p>

            <div className="mt-4 space-y-2">
              {items.map((it) => {
                const preview = it.preview.length > 60 ? `${it.preview.slice(0, 60)}…` : it.preview;
                return (
                  <div
                    key={it.id}
                    className="flex items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/10"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                        {preview}
                      </p>
                      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{it.id}</p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold",
                        kindTone(it.kind),
                      ].join(" ")}
                    >
                      {kindLabel(it.kind)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              Sau khi approve, <span className="font-semibold">4 testcase</span> liên quan sẽ bị flag{" "}
              <span aria-hidden>⚠</span> cần review lại
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Ghi chú approve (optional)
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Lý do approve..."
                className="mt-2 h-24 w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-emerald-900/30"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <Link
              href={backToDiff}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
              aria-disabled={submitting}
              tabIndex={submitting ? -1 : 0}
              onClick={(e) => {
                if (submitting) e.preventDefault();
              }}
            >
              Quay lại
            </Link>

            <button
              type="button"
              onClick={onConfirm}
              disabled={submitting}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                submitting
                  ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                  : "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700",
              ].join(" ")}
            >
              {submitting ? (
                <>
                  <Spinner />
                  Đang re-embedding các chunk...
                </>
              ) : (
                "Xác nhận approve"
              )}
            </button>
          </div>
        </div>
      </div>

      {toastOpen ? (
        <Toast
          title="Approve thành công"
          body="Các chunk đã được cập nhật."
          onClose={() => setToastOpen(false)}
          action={
            <Link
              href={backToS5}
              className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
            >
              Quay về Version detail
            </Link>
          }
        />
      ) : null}
    </>
  );
}

