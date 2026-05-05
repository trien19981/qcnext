"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DocType = "basic_design" | "api" | "detail" | "figma" | "testcase_manual";
type DocStatus = "draft" | "processing" | "ready_for_review" | "approved" | "rejected";
type ScreenKey = "login" | "dashboard" | "documents" | "diff_viewer" | "chat";

type DocVersion = {
  id: string;
  version: number;
  updatedAt: string;
  status: DocStatus;
  updatedBy: string;
};

type DocumentItem = {
  id: string;
  title: string;
  screen: ScreenKey;
  docType: DocType;
  versions: DocVersion[];
};

const docTypeLabel: Record<DocType, string> = {
  basic_design: "Basic Design",
  api: "API",
  detail: "Detail",
  figma: "Figma",
  testcase_manual: "Testcase manual",
};

const screenLabel: Record<ScreenKey, string> = {
  login: "Login",
  dashboard: "Dashboard",
  documents: "Documents",
  diff_viewer: "Diff Viewer",
  chat: "Chat",
};

const documentsMock: DocumentItem[] = [
  {
    id: "doc_login_basic",
    title: "Login · Basic Design",
    screen: "login",
    docType: "basic_design",
    versions: [
      {
        id: "v_12",
        version: 12,
        updatedAt: "2026-04-28",
        status: "ready_for_review",
        updatedBy: "pm@company.com",
      },
      {
        id: "v_11",
        version: 11,
        updatedAt: "2026-04-20",
        status: "approved",
        updatedBy: "admin@company.com",
      },
    ],
  },
  {
    id: "doc_login_api",
    title: "Auth API Spec",
    screen: "login",
    docType: "api",
    versions: [
      {
        id: "v_3",
        version: 3,
        updatedAt: "2026-04-22",
        status: "approved",
        updatedBy: "admin@company.com",
      },
    ],
  },
  {
    id: "doc_dashboard_detail",
    title: "Dashboard · Detail Spec",
    screen: "dashboard",
    docType: "detail",
    versions: [
      {
        id: "v_7",
        version: 7,
        updatedAt: "2026-04-20",
        status: "draft",
        updatedBy: "pm@company.com",
      },
      {
        id: "v_6",
        version: 6,
        updatedAt: "2026-04-10",
        status: "rejected",
        updatedBy: "admin@company.com",
      },
    ],
  },
  {
    id: "doc_figma_links",
    title: "Figma · File Links",
    screen: "documents",
    docType: "figma",
    versions: [
      {
        id: "v_2",
        version: 2,
        updatedAt: "2026-04-18",
        status: "processing",
        updatedBy: "pm@company.com",
      },
      {
        id: "v_1",
        version: 1,
        updatedAt: "2026-04-16",
        status: "approved",
        updatedBy: "admin@company.com",
      },
    ],
  },
  {
    id: "doc_login_manual_tc",
    title: "Login · Manual Testcases",
    screen: "login",
    docType: "testcase_manual",
    versions: [
      {
        id: "v_4",
        version: 4,
        updatedAt: "2026-04-21",
        status: "approved",
        updatedBy: "qc@company.com",
      },
    ],
  },
];

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

function IconButton({
  href,
  title,
  children,
  tone,
}: {
  href: string;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "violet";
}) {
  const cls =
    tone === "violet"
      ? "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
      : "border-zinc-200 bg-white/70 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30";

  return (
    <Link
      href={href}
      className={[
        "rounded-md border px-2 py-1 text-xs font-semibold transition",
        cls,
      ].join(" ")}
      title={title}
      aria-label={title}
    >
      {children}
    </Link>
  );
}

export function DocumentsClient({ projectId }: { projectId?: string }) {
  const [docType, setDocType] = useState<DocType | "all">("all");
  const [screen, setScreen] = useState<ScreenKey | "all">("all");

  const [currentRole, setCurrentRole] = useState<"pm" | "qc" | "dev" | "admin">("pm"); // TODO: bind theo auth/session
  const canUpload = currentRole === "pm" || currentRole === "admin";

  const projectName = useMemo(() => {
    if (!projectId) return "—";
    if (projectId === "p_qcmaster") return "QC Master";
    if (projectId === "p_castinghub") return "CastingHub";
    if (projectId === "p_legacy") return "Legacy Portal";
    return projectId;
  }, [projectId]);

  const filtered = useMemo(() => {
    return documentsMock.filter((d) => {
      const okType = docType === "all" ? true : d.docType === docType;
      const okScreen = screen === "all" ? true : d.screen === screen;
      return okType && okScreen;
    });
  }, [docType, screen]);

  const rows = useMemo(() => {
    return filtered.map((d) => {
      const latest = [...d.versions].sort((a, b) => b.version - a.version)[0];
      return { doc: d, latest };
    });
  }, [filtered]);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto grid w-full max-w-7xl grid-cols-12 gap-6 px-6 py-8">
        <aside className="col-span-12 md:col-span-3">
          <div className="sticky top-6 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
              Project
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {projectName}
            </p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {projectId ? `ID: ${projectId}` : "Chưa chọn project"}
            </p>

            <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                Project nav
              </p>
              <nav className="mt-2 space-y-1">
                <Link
                  href={
                    projectId
                      ? `/documents?projectId=${encodeURIComponent(projectId)}`
                      : "/documents"
                  }
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
                  href={
                    projectId
                      ? `/testcases?projectId=${encodeURIComponent(projectId)}`
                      : "/testcases"
                  }
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
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
              </nav>
            </div>

            <div className="mt-4 border-t border-zinc-200/70 pt-4 dark:border-zinc-800">
              <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
                Demo role
              </p>
              <div className="mt-2 inline-flex flex-wrap overflow-hidden rounded-lg border border-zinc-200 bg-white/70 dark:border-zinc-800 dark:bg-zinc-900/40">
                {(["pm", "qc", "dev", "admin"] as const).map((r) => {
                  const selected = currentRole === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCurrentRole(r)}
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
          </div>
        </aside>

        <main className="col-span-12 md:col-span-9">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {projectName}
                  </span>{" "}
                  <span aria-hidden className="mx-1">
                    ›
                  </span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">Documents</span>
                </nav>
                <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Document list
                </h1>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  Danh sách toàn bộ tài liệu của 1 project. Điểm vào của mọi thao tác với tài liệu.
                </p>
              </div>

              {canUpload ? (
                <Link
                  href={
                    projectId
                      ? `/documents/upload?projectId=${encodeURIComponent(projectId)}`
                      : "/documents/upload"
                  }
                  className="inline-flex items-center justify-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
                >
                  + Upload tài liệu
                </Link>
              ) : null}
            </div>

            <section className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Loại tài liệu
                    </span>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocType | "all")}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    >
                      <option value="all">All</option>
                      {(
                        [
                          "basic_design",
                          "api",
                          "detail",
                          "figma",
                          "testcase_manual",
                        ] as const
                      ).map((t) => (
                        <option key={t} value={t}>
                          {docTypeLabel[t]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Màn hình
                    </span>
                    <select
                      value={screen}
                      onChange={(e) => setScreen(e.target.value as ScreenKey | "all")}
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                    >
                      <option value="all">All</option>
                      {(["login", "dashboard", "documents", "diff_viewer", "chat"] as const).map(
                        (s) => (
                          <option key={s} value={s}>
                            {screenLabel[s]}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Actions: Xem · So sánh version · Upload version mới
                </p>
              </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="grid grid-cols-12 gap-0 border-b border-zinc-200/70 px-4 py-3 text-xs font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                <div className="col-span-4">Tên màn hình</div>
                <div className="col-span-2">Loại</div>
                <div className="col-span-1">Version</div>
                <div className="col-span-2">Trạng thái</div>
                <div className="col-span-1">Ngày update</div>
                <div className="col-span-1">Người update</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

              {rows.length === 0 ? (
                <div className="px-4 py-10 text-sm text-zinc-600 dark:text-zinc-400">
                  Không có tài liệu phù hợp với filter hiện tại.
                </div>
              ) : (
                <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                  {rows.map(({ doc, latest }) => {
                    const isOpen = !!expanded[doc.id];
                    const viewHref = projectId
                      ? `/documents/${encodeURIComponent(doc.id)}?projectId=${encodeURIComponent(projectId)}`
                      : `/documents/${encodeURIComponent(doc.id)}`;
                    const diffHref = projectId
                      ? `/diff-review?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(doc.id)}`
                      : `/diff-review?docId=${encodeURIComponent(doc.id)}`;
                    const uploadHref = projectId
                      ? `/documents/upload?projectId=${encodeURIComponent(projectId)}&docId=${encodeURIComponent(doc.id)}`
                      : `/documents/upload?docId=${encodeURIComponent(doc.id)}`;

                    return (
                      <li key={doc.id} className="px-4 py-4">
                        <div className="grid grid-cols-12 items-center gap-0">
                          <div className="col-span-4 flex items-start gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded((m) => ({ ...m, [doc.id]: !m[doc.id] }))
                              }
                              className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white/70 text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
                              aria-label={isOpen ? "Collapse versions" : "Expand versions"}
                            >
                              <span
                                className={[
                                  "inline-block transition-transform",
                                  isOpen ? "rotate-90" : "rotate-0",
                                ].join(" ")}
                              >
                                ▶
                              </span>
                            </button>
                            <div className="min-w-0">
                              <Link
                                href={viewHref}
                                className="block truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
                              >
                                {screenLabel[doc.screen]} · {doc.title}
                              </Link>
                              <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                {doc.id}
                              </p>
                            </div>
                          </div>

                          <div className="col-span-2 text-sm text-zinc-700 dark:text-zinc-300">
                            {docTypeLabel[doc.docType]}
                          </div>
                          <div className="col-span-1 text-sm text-zinc-700 dark:text-zinc-300">
                            v{latest.version}
                          </div>
                          <div className="col-span-2">
                            <StatusBadge status={latest.status} />
                          </div>
                          <div className="col-span-1 text-xs text-zinc-600 dark:text-zinc-400">
                            {latest.updatedAt}
                          </div>
                          <div className="col-span-1 truncate text-xs text-zinc-600 dark:text-zinc-400">
                            {latest.updatedBy}
                          </div>
                          <div className="col-span-1 flex justify-end gap-2">
                            <IconButton href={viewHref} title="Xem">
                              👁
                            </IconButton>
                            <IconButton href={diffHref} title="So sánh version">
                              ⇄
                            </IconButton>
                            {canUpload ? (
                              <IconButton href={uploadHref} title="Upload version mới" tone="violet">
                                ⬆
                              </IconButton>
                            ) : null}
                          </div>
                        </div>

                        {isOpen ? (
                          <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 bg-white/60 dark:border-zinc-800 dark:bg-zinc-950/10">
                            <div className="grid grid-cols-12 gap-0 border-b border-zinc-200/70 px-3 py-2 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                              <div className="col-span-2">Version</div>
                              <div className="col-span-4">Status</div>
                              <div className="col-span-3">Updated</div>
                              <div className="col-span-3">Updated by</div>
                            </div>
                            <ul className="divide-y divide-zinc-200/70 dark:divide-zinc-800">
                              {[...doc.versions]
                                .sort((a, b) => b.version - a.version)
                                .map((v) => (
                                  <li key={v.id} className="px-3 py-2">
                                    <div className="grid grid-cols-12 items-center gap-0">
                                      <div className="col-span-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                        v{v.version}
                                      </div>
                                      <div className="col-span-4">
                                        <StatusBadge status={v.status} />
                                      </div>
                                      <div className="col-span-3 text-xs text-zinc-600 dark:text-zinc-400">
                                        {v.updatedAt}
                                      </div>
                                      <div className="col-span-3 truncate text-xs text-zinc-600 dark:text-zinc-400">
                                        {v.updatedBy}
                                      </div>
                                    </div>
                                  </li>
                                ))}
                            </ul>
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

