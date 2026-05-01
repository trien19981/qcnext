"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Role = "qc" | "pm" | "admin" | "dev";
type ScreenKey = "login" | "dashboard" | "documents" | "diff_viewer" | "chat";
type TcType = "Manual" | "API" | "E2E";
type TcPriority = "Critical" | "High" | "Medium" | "Low";
type TcStatus = "Active" | "Draft" | "Archived";

type LinkedDoc = {
  docId: string;
  chunkId?: string;
  label: string;
};

type TestcaseRow = {
  id: string;
  title: string;
  screen: ScreenKey;
  priority: TcPriority;
  type: TcType;
  status: TcStatus;
  linked: LinkedDoc[];
  createdAt: string;
  flagged: boolean;
  steps: string[];
  expected: string;
};

const screenLabel: Record<ScreenKey, string> = {
  login: "Login",
  dashboard: "Dashboard",
  documents: "Documents",
  diff_viewer: "Diff Viewer",
  chat: "Chat",
};

function priorityTone(p: TcPriority) {
  if (p === "Critical")
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  if (p === "High")
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  if (p === "Medium")
    return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
  return "border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300";
}

function statusTone(s: TcStatus) {
  if (s === "Active")
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  if (s === "Archived")
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
        <div className={["w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950", widthClass].join(" ")}>
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{title}</p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-50"
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

function projectNameFromId(projectId?: string) {
  if (!projectId) return "—";
  if (projectId === "p_qcmaster") return "QC Master";
  if (projectId === "p_castinghub") return "CastingHub";
  if (projectId === "p_legacy") return "Legacy Portal";
  return projectId;
}

const rowsMock: TestcaseRow[] = [
  {
    id: "TC-101",
    title: "Login success redirects to Project List",
    screen: "login",
    priority: "Critical",
    type: "Manual",
    status: "Active",
    linked: [{ docId: "doc_login_basic", chunkId: "c2", label: "Login · Basic Design · Redirect" }],
    createdAt: "2026-04-28",
    flagged: true,
    steps: ["Mở màn Login", "Nhập email/password hợp lệ", "Bấm Đăng nhập"],
    expected: "Redirect thẳng vào Project List theo role.",
  },
  {
    id: "TC-102",
    title: "Invalid password shows error state",
    screen: "login",
    priority: "High",
    type: "Manual",
    status: "Draft",
    linked: [{ docId: "doc_login_basic", chunkId: "c3", label: "Login · Basic Design · Error" }],
    createdAt: "2026-04-22",
    flagged: false,
    steps: ["Mở màn Login", "Nhập email đúng + password sai", "Bấm Đăng nhập"],
    expected: "Hiện border đỏ và message lỗi dưới form.",
  },
  {
    id: "TC-220",
    title: "Healthcheck endpoint returns 200",
    screen: "dashboard",
    priority: "Medium",
    type: "API",
    status: "Active",
    linked: [],
    createdAt: "2026-04-10",
    flagged: false,
    steps: ["Gọi GET /api/health"],
    expected: "HTTP 200 + payload hợp lệ.",
  },
];

export function TestcasesClient({
  projectId,
  initialRole,
}: {
  projectId?: string;
  initialRole: Role;
}) {
  const projectName = projectNameFromId(projectId);
  const [role, setRole] = useState<Role>(initialRole);
  const canCreate = role === "qc" || role === "pm" || role === "admin";

  const [filterScreen, setFilterScreen] = useState<ScreenKey | "all">("all");
  const [filterType, setFilterType] = useState<TcType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<TcPriority | "all">("all");
  const [filterStatus, setFilterStatus] = useState<TcStatus | "all">("all");
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const [genOpen, setGenOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rowsMock.filter((r) => {
      const okScreen = filterScreen === "all" ? true : r.screen === filterScreen;
      const okType = filterType === "all" ? true : r.type === filterType;
      const okPri = filterPriority === "all" ? true : r.priority === filterPriority;
      const okStatus = filterStatus === "all" ? true : r.status === filterStatus;
      const okSearch = !q
        ? true
        : r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.linked.some((l) => l.label.toLowerCase().includes(q));
      return okScreen && okType && okPri && okStatus && okSearch;
    });
  }, [filterScreen, filterType, filterPriority, filterStatus, search]);

  const selectedCount = useMemo(
    () => filtered.reduce((n, r) => n + (selected[r.id] ? 1 : 0), 0),
    [filtered, selected],
  );

  const allChecked = filtered.length > 0 && selectedCount === filtered.length;

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-none grid-cols-12 gap-6 px-6 py-8">
        <aside className="col-span-12 md:col-span-3 lg:col-span-2">
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
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                >
                  Documents
                </Link>
                <Link
                  href="/testcases"
                  className="block rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200"
                >
                  Testcases
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
              <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">Demo role</p>
              <div className="mt-2 inline-flex flex-wrap overflow-hidden rounded-lg border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/40">
                {(["qc", "pm", "admin", "dev"] as const).map((r) => {
                  const selectedRole = role === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={[
                        "px-3 py-2 text-xs font-semibold transition",
                        selectedRole
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/40",
                      ].join(" ")}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              {!canCreate ? (
                <p className="mt-2 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Dev chỉ được xem (v1).
                </p>
              ) : null}
            </div>
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9 lg:col-span-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">TC list</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Danh sách testcase của project hoặc 1 màn hình. Filter đa chiều + bulk actions.
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
                onClick={() => setGenOpen(true)}
                className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                disabled={!canCreate}
              >
                Generate TC bằng AI
              </button>
              <Link
                href={tcEditorBase}
                aria-disabled={!canCreate}
                tabIndex={!canCreate ? -1 : 0}
                onClick={(e) => {
                  if (!canCreate) e.preventDefault();
                }}
                className={[
                  "rounded-lg px-4 py-2 text-sm font-semibold text-white transition",
                  !canCreate
                    ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700",
                ].join(" ")}
              >
                + Tạo testcase mới
              </Link>
            </div>
          </div>

          <section className="mt-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="grid gap-3 lg:grid-cols-5">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Màn hình</span>
                <select
                  value={filterScreen}
                  onChange={(e) => setFilterScreen(e.target.value as ScreenKey | "all")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="all">All</option>
                  {(Object.keys(screenLabel) as ScreenKey[]).map((s) => (
                    <option key={s} value={s}>
                      {screenLabel[s]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Loại</span>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as TcType | "all")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="all">All</option>
                  {(["Manual", "API", "E2E"] as const).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Priority</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as TcPriority | "all")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="all">All</option>
                  {(["Critical", "High", "Medium", "Low"] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Trạng thái</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as TcStatus | "all")}
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                >
                  <option value="all">All</option>
                  {(["Active", "Draft", "Archived"] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block lg:col-span-1">
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Search</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm theo ID/tiêu đề/tài liệu…"
                  className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                />
              </label>
            </div>

            {selectedCount > 0 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-white/60 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-950/10">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Đã chọn {selectedCount} testcase
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                  >
                    Archive đã chọn
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  >
                    Xoá đã chọn
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          <section className="mt-4 overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
            <div className="grid grid-cols-12 gap-0 border-b border-zinc-200/70 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={(e) => {
                    const next = e.target.checked;
                    const map: Record<string, boolean> = { ...selected };
                    for (const r of filtered) map[r.id] = next;
                    setSelected(map);
                  }}
                  className="h-4 w-4 accent-violet-600"
                />
              </div>
              <div className="col-span-1">ID</div>
              <div className="col-span-4">Tiêu đề</div>
              <div className="col-span-1">Màn hình</div>
              <div className="col-span-1">Priority</div>
              <div className="col-span-1">Loại</div>
              <div className="col-span-1">Trạng thái</div>
              <div className="col-span-2">Tài liệu linked</div>
              <div className="col-span-0" />
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-sm text-zinc-600 dark:text-zinc-400">
                Không có testcase phù hợp với filter hiện tại.
              </div>
            ) : (
              <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                {filtered.map((r) => {
                  const isOpen = !!expanded[r.id];
                  const tcEditHref = `${tcEditorBase}${tcEditorBase.includes("?") ? "&" : "?"}tcId=${encodeURIComponent(r.id)}`;
                  return (
                    <li key={r.id}>
                      <div className="px-4 py-3 transition hover:bg-zinc-50/70 dark:hover:bg-zinc-800/20">
                        <div
                          className="grid grid-cols-12 items-center gap-0"
                          onClick={() => setExpanded((m) => ({ ...m, [r.id]: !m[r.id] }))}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") setExpanded((m) => ({ ...m, [r.id]: !m[r.id] }));
                          }}
                        >
                          <div className="col-span-1">
                            <input
                              type="checkbox"
                              checked={!!selected[r.id]}
                              onChange={(e) => setSelected((m) => ({ ...m, [r.id]: e.target.checked }))}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 accent-violet-600"
                            />
                          </div>
                          <div className="col-span-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                            {r.flagged ? <span title="Cần review" className="mr-1 text-amber-500">⚠</span> : null}
                            {r.id}
                            <p className="mt-1 text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                              {r.createdAt}
                            </p>
                          </div>
                          <div className="col-span-4">
                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                              {r.title}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-zinc-600 dark:text-zinc-400">
                              {r.expected}
                            </p>
                          </div>
                          <div className="col-span-1 text-sm text-zinc-700 dark:text-zinc-300">
                            {screenLabel[r.screen]}
                          </div>
                          <div className="col-span-1">
                            <Pill className={priorityTone(r.priority)}>{r.priority}</Pill>
                          </div>
                          <div className="col-span-1 text-sm text-zinc-700 dark:text-zinc-300">
                            {r.type}
                          </div>
                          <div className="col-span-1">
                            <Pill className={statusTone(r.status)}>{r.status}</Pill>
                          </div>
                          <div className="col-span-2">
                            <div className="flex flex-wrap gap-2">
                              {r.linked.length === 0 ? (
                                <span className="text-xs text-zinc-500 dark:text-zinc-500">—</span>
                              ) : (
                                r.linked.map((l) => {
                                  const hrefBase = `/documents/${encodeURIComponent(l.docId)}/viewer`;
                                  const qs = new URLSearchParams();
                                  if (projectId) qs.set("projectId", projectId);
                                  if (l.chunkId) qs.set("chunkId", l.chunkId);
                                  const href = `${hrefBase}?${qs.toString()}`;
                                  return (
                                    <a
                                      key={l.label}
                                      href={href}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-800 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                                      title="Open in Doc viewer"
                                    >
                                      📄 {l.label}
                                    </a>
                                  );
                                })
                              )}
                            </div>
                          </div>
                          <div className="col-span-0" />
                          <div className="col-span-1 flex justify-end gap-2">
                            <Link
                              href={tcEditHref}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-md border border-zinc-200 bg-white/70 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                              title="Xem"
                            >
                              👁
                            </Link>
                            <Link
                              href={tcEditHref}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-md border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
                              title="Sửa"
                            >
                              ✎
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteId(r.id);
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-800 transition hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                              title="Xoá"
                              disabled={!canCreate}
                            >
                              🗑
                            </button>
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-3 rounded-xl border border-zinc-200 bg-white/60 p-4 dark:border-zinc-800 dark:bg-zinc-950/10">
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              Preview steps
                            </p>
                            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                              {r.steps.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ol>
                            <p className="mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                              Expected result
                            </p>
                            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{r.expected}</p>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </main>
      </div>

      {genOpen ? (
        <Modal title="Generate TC bằng AI" widthClass="max-w-[560px]" onClose={() => setGenOpen(false)}>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            (Mock) Chọn màn hình + loại tài liệu để generate testcase.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Màn hình</span>
              <select className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50">
                {(Object.keys(screenLabel) as ScreenKey[]).map((s) => (
                  <option key={s} value={s}>
                    {screenLabel[s]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Loại tài liệu</span>
              <select className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-50">
                <option>Basic Design</option>
                <option>API Design</option>
                <option>Detail Design</option>
                <option>Figma</option>
              </select>
            </label>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGenOpen(false)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
            >
              Huỷ
            </button>
            <Link
              href={`${tcEditorBase}${tcEditorBase.includes("?") ? "&" : "?"}source=ai_generate`}
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
            >
              Generate
            </Link>
          </div>
        </Modal>
      ) : null}

      {deleteId ? (
        <Modal title="Xác nhận xoá" widthClass="max-w-[520px]" onClose={() => setDeleteId(null)}>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            Bạn có chắc muốn xoá testcase <span className="font-mono">{deleteId}</span>?
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => setDeleteId(null)}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 active:bg-red-700"
            >
              Xoá
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

