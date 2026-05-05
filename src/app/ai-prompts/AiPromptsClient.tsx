"use client";

import Link from "next/link";
import { isAxiosError } from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AI_PROMPT_META, deleteAiPromptOverride, fetchAiPrompts, patchAiPrompt } from "@/features/ai-prompts";
import { fetchProjectDetail } from "@/features/projects";

type Role = "qc" | "pm" | "admin" | "dev" | "owner";

function isUuid(s: string | undefined): s is string {
  if (!s) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

function canEditPrompts(role: Role): boolean {
  return role === "admin" || role === "owner" || role === "pm";
}

function apiErr(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const d = err.response?.data as { message?: string } | undefined;
    if (d?.message) return d.message;
  }
  return fallback;
}

export function AiPromptsClient({
  projectId,
  initialRole,
}: {
  projectId?: string;
  initialRole: Role;
}) {
  const [role] = useState<Role>(initialRole);
  const projectOk = isUuid(projectId);
  const editable = canEditPrompts(role);

  const [projectName, setProjectName] = useState(projectOk ? "…" : "—");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState(AI_PROMPT_META[0]!.key);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ open: boolean; title: string; body: string }>({
    open: false,
    title: "",
    body: "",
  });

  const showToast = useCallback((title: string, body: string) => {
    setToast({ open: true, title, body });
  }, []);

  const load = useCallback(async () => {
    if (!projectOk || !projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAiPrompts(projectId);
      const next: Record<string, string> = {};
      for (const p of res.prompts) next[p.key] = p.content;
      setDrafts(next);
    } catch (e) {
      setError(apiErr(e, "Không tải được prompt."));
    } finally {
      setLoading(false);
    }
  }, [projectId, projectOk]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const activeMeta = useMemo(() => AI_PROMPT_META.find((m) => m.key === activeKey), [activeKey]);
  const activeDraft = drafts[activeKey] ?? "";

  const save = async () => {
    if (!projectOk || !projectId || !editable) return;
    try {
      await patchAiPrompt(projectId, activeKey, activeDraft);
      showToast("Đã lưu", "Prompt đã được cập nhật trên server.");
      await load();
    } catch (e) {
      showToast("Lỗi", apiErr(e, "Lưu thất bại."));
    }
  };

  const resetDefault = async () => {
    if (!projectOk || !projectId || !editable) return;
    if (!window.confirm("Xoá override và dùng lại prompt mặc định của hệ thống?")) return;
    try {
      await deleteAiPromptOverride(projectId, activeKey);
      showToast("Đã khôi phục", "Đang dùng prompt mặc định.");
      await load();
    } catch (e) {
      const msg = apiErr(e, "Không xoá được override.");
      if (isAxiosError(e) && e.response?.status === 404) {
        showToast("Thông tin", "Chưa có override — đang dùng mặc định.");
        await load();
      } else {
        showToast("Lỗi", msg);
      }
    }
  };

  const docsHref = projectId ? `/documents?projectId=${encodeURIComponent(projectId)}` : "/documents";
  const tcHref = projectId ? `/testcases?projectId=${encodeURIComponent(projectId)}` : "/testcases";
  const selfHref = projectId ? `/ai-prompts?projectId=${encodeURIComponent(projectId)}` : "/ai-prompts";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Project</p>
            <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">{projectName}</p>
            <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
              {projectOk ? projectId : "Thêm ?projectId=… (UUID)"}
            </p>
            <nav className="mt-4 space-y-1 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <Link href={docsHref} className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30">
                Documents
              </Link>
              <Link href={tcHref} className="block rounded-lg px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/30">
                Testcases
              </Link>
              <span className="block rounded-lg bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 dark:bg-violet-950/40 dark:text-violet-200">
                Prompt AI
              </span>
            </nav>
            {!editable ? (
              <p className="mt-3 text-xs text-amber-800 dark:text-amber-200">Chỉ Owner / PM / Admin mới chỉnh được prompt (API).</p>
            ) : null}
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Quản lý prompt AI</h1>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                Prompt Q&A, câu hỏi gợi ý và generate testcase — lưu theo project, fallback mặc định nếu chưa ghi DB.
              </p>
            </div>
            {projectOk ? (
              <Link href={selfHref} className="text-xs font-semibold text-violet-700 underline dark:text-violet-300">
                Link trang này
              </Link>
            ) : null}
          </div>

          {!projectOk ? (
            <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-8 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/20 dark:text-zinc-400">
              <p className="font-semibold text-zinc-800 dark:text-zinc-200">Cần project UUID</p>
              <p className="mt-2">Ví dụ:</p>
              <code className="mt-2 inline-block rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">/ai-prompts?projectId=&lt;uuid&gt;</code>
            </div>
          ) : error ? (
            <div className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Chọn prompt</p>
                <ul className="mt-2 space-y-1">
                  {AI_PROMPT_META.map((m) => (
                    <li key={m.key}>
                      <button
                        type="button"
                        onClick={() => setActiveKey(m.key)}
                        className={[
                          "w-full rounded-xl border px-3 py-3 text-left text-sm transition",
                          activeKey === m.key
                            ? "border-violet-300 bg-violet-50 font-semibold text-violet-900 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-100"
                            : "border-zinc-200 bg-white/80 text-zinc-800 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-200 dark:hover:border-zinc-600",
                        ].join(" ")}
                      >
                        {m.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-8">
                <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{activeMeta?.title}</p>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{activeMeta?.hint}</p>
                  <p className="mt-2 font-mono text-[11px] text-zinc-500 dark:text-zinc-500">key: {activeKey}</p>
                  {loading ? (
                    <div className="mt-4 h-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                  ) : (
                    <textarea
                      value={activeDraft}
                      onChange={(e) => setDrafts((d) => ({ ...d, [activeKey]: e.target.value }))}
                      disabled={!editable}
                      rows={18}
                      className="mt-4 w-full resize-y rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-violet-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                      spellCheck={false}
                    />
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={!editable || loading}
                      onClick={() => void save()}
                      className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      disabled={!editable || loading}
                      onClick={() => void resetDefault()}
                      className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                      Khôi phục mặc định
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void load()}
                      className="rounded-lg px-4 py-2 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800/40"
                    >
                      Tải lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {toast.open ? (
        <div className="fixed bottom-6 right-6 z-60 max-w-sm rounded-2xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{toast.title}</p>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{toast.body}</p>
          <button
            type="button"
            className="mt-3 text-xs font-semibold text-violet-700 dark:text-violet-300"
            onClick={() => setToast((t) => ({ ...t, open: false }))}
          >
            Đóng
          </button>
        </div>
      ) : null}
    </div>
  );
}
