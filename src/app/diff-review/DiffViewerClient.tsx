"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

type Role = "pm" | "admin" | "qc" | "dev";
type ChangeKind = "add" | "delete" | "edit";

type VersionMeta = {
  id: string;
  version: number;
  date: string;
};

type DiffBlock = {
  id: string;
  title: string;
  kind: ChangeKind;
  oldText?: string;
  newText?: string;
};

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

function SmallPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300">
      {children}
    </span>
  );
}

function buildMockDiff(fromId: string, toId: string) {
  const versions: VersionMeta[] = [
    { id: "v_11", version: 11, date: "10/05/2025" },
    { id: "v_12", version: 12, date: "15/06/2025" },
    { id: "v_13", version: 13, date: "28/04/2026" },
  ];

  const blocks: DiffBlock[] = [
    {
      id: "chg_1",
      title: "Redirect rule after login",
      kind: "edit",
      oldText: "After login: redirect to dashboard.",
      newText: "After login: detect role and redirect to Project List.",
    },
    {
      id: "chg_2",
      title: "Error message copy",
      kind: "edit",
      oldText: "Hiển thị lỗi chung khi login fail.",
      newText: "Message: 'Email hoặc mật khẩu không đúng' dưới form.",
    },
    {
      id: "chg_3",
      title: "Add show/hide password toggle",
      kind: "add",
      newText: "Input Password có icon show/hide bên phải.",
    },
    {
      id: "chg_4",
      title: "Remove sidebar mention",
      kind: "delete",
      oldText: "Có sidebar ở màn Login.",
    },
    {
      id: "chg_5",
      title: "Update layout width",
      kind: "edit",
      oldText: "Centered card 360px.",
      newText: "Centered card 400px.",
    },
  ];

  const from = versions.find((v) => v.id === fromId) ?? versions[0];
  const to = versions.find((v) => v.id === toId) ?? versions[1];
  return { versions, from, to, blocks };
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

  const [fromId, setFromId] = useState<string>(initialFrom ?? "v_11");
  const [toId, setToId] = useState<string>(initialTo ?? "v_12");

  const { versions, from, to, blocks } = useMemo(() => buildMockDiff(fromId, toId), [fromId, toId]);

  const summary = useMemo(() => {
    const adds = blocks.filter((b) => b.kind === "add").length;
    const dels = blocks.filter((b) => b.kind === "delete").length;
    const edits = blocks.filter((b) => b.kind === "edit").length;
    return { total: blocks.length, adds, dels, edits };
  }, [blocks]);

  const [approved, setApproved] = useState<Record<string, boolean>>({});
  const approvedCount = useMemo(
    () => blocks.reduce((n, b) => n + (approved[b.id] ? 1 : 0), 0),
    [blocks, approved],
  );

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
  const approveSelectedHref =
    docId
      ? `${approveHrefBase}&docId=${encodeURIComponent(docId)}&from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&mode=selected`
      : `${approveHrefBase}&from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&mode=selected`;

  const approveAllHref =
    docId
      ? `${approveHrefBase}&docId=${encodeURIComponent(docId)}&from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&mode=all`
      : `${approveHrefBase}&from=${encodeURIComponent(from.id)}&to=${encodeURIComponent(to.id)}&mode=all`;

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
                {from.id}
              </span>{" "}
              với{" "}
              <span className="font-mono">
                {to.id}
              </span>
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Old</span>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">New</span>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.version}
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
                  (Mock) AI sẽ tự phân tích và highlight thay đổi trước khi approve.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-12 gap-6">
          {/* Jump nav */}
          <aside className="col-span-12 md:col-span-3">
            <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Jump</p>
              <div className="mt-3 space-y-2">
                {blocks.map((b, idx) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => {
                      blockRefs.current[b.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 text-left transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 dark:hover:bg-zinc-800/30"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-50">
                        {idx + 1}. {b.title}
                      </p>
                      <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                        {kindLabel(b.kind)}
                      </p>
                    </div>
                    {approved[b.id] ? <SmallPill>✓</SmallPill> : <SmallPill> </SmallPill>}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Diff columns */}
          <main className="col-span-12 md:col-span-9">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Version {from.version} — {from.date}
                  </p>
                  <SmallPill>Cũ</SmallPill>
                </div>
                <div className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                  Cột trái hiển thị nội dung version cũ theo từng block thay đổi.
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                    Version {to.version} — {to.date}
                  </p>
                  <SmallPill>Mới</SmallPill>
                </div>
                <div className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                  Cột phải hiển thị nội dung version mới theo từng block thay đổi.
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {blocks.map((b) => {
                const checked = !!approved[b.id];
                const canToggle = canApprove;
                return (
                  <div
                    key={b.id}
                    ref={(el) => {
                      blockRefs.current[b.id] = el;
                    }}
                    className={[
                      "rounded-2xl border p-4 shadow-sm",
                      kindTone(b.kind),
                      "bg-white/70 dark:bg-zinc-950/10",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                          {b.title}
                        </p>
                        <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                          {kindLabel(b.kind)}
                        </p>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={!canToggle}
                          onChange={(e) => setApproved((m) => ({ ...m, [b.id]: e.target.checked }))}
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
                        {b.oldText ? (
                          <p
                            className={[
                              "mt-2 text-sm text-zinc-800 dark:text-zinc-200",
                              b.kind === "delete" ? "line-through text-red-800 dark:text-red-200" : "",
                            ].join(" ")}
                          >
                            {b.oldText}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">—</p>
                        )}
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-white/60 p-3 dark:border-zinc-800 dark:bg-zinc-950/10">
                        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                          New
                        </p>
                        {b.newText ? (
                          <p
                            className={[
                              "mt-2 text-sm text-zinc-800 dark:text-zinc-200",
                              b.kind === "add" ? "text-emerald-900 dark:text-emerald-200" : "",
                            ].join(" ")}
                          >
                            {b.newText}
                          </p>
                        ) : (
                          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-500">—</p>
                        )}
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
            Đã chọn {approvedCount}/{summary.total} thay đổi
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
              disabled={!canApprove}
              className={[
                "rounded-lg border px-4 py-2 text-sm font-semibold transition",
                !canApprove
                  ? "cursor-not-allowed border-zinc-200 bg-white text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950/30"
                  : "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60",
              ].join(" ")}
            >
              Reject tất cả
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

