"use client";

import Link from "next/link";
import type { AxiosError } from "axios";
import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import {
  createConversation,
  fetchConversationMessages,
  fetchConversations,
  fetchSuggestedQuestions,
  sendConversationMessage,
  type CitationOut,
  type ConversationListItem,
  type MessageOut,
} from "@/features/chat";

type ScopeMode = "project" | "screen" | "doc_type";
type DocType = "basic_design" | "api_design" | "detail_design" | "figma";
type ScreenKey = "login" | "dashboard" | "documents" | "diff_viewer" | "chat";

type Citation = {
  id: string;
  label: string;
  docId: string;
  versionId?: string;
  chunkId?: string;
};

type Message = {
  id: string;
  role: "user" | "ai";
  text: string;
  citations?: Citation[];
  confidence?: "normal" | "low";
  noSources?: boolean;
  createdAt: number;
};

type Conversation = {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
};

const screenLabel: Record<ScreenKey, string> = {
  login: "Login",
  dashboard: "Dashboard",
  documents: "Documents",
  diff_viewer: "Diff Viewer",
  chat: "Chat",
};

const docTypeLabel: Record<DocType, string> = {
  basic_design: "Basic",
  api_design: "API",
  detail_design: "Detail",
  figma: "Figma",
};

function dayLabel(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="AI typing">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400" />
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:150ms]" />
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-zinc-400 [animation-delay:300ms]" />
    </span>
  );
}

function Chip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
    >
      {children}
    </button>
  );
}

function safeMarked(md: string) {
  const html = marked.parse(md, { breaks: true }) as string;
  return DOMPurify.sanitize(html);
}

function countSources(citations?: Citation[]) {
  const cites = citations ?? [];
  const docSet = new Set(cites.map((c) => c.docId));
  return { excerptCount: cites.length, docCount: docSet.size };
}

const citationBadgeClass =
  "inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60";

function CitationBadge({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <span
        className={`${citationBadgeClass} cursor-not-allowed opacity-50`}
        title="Không có liên kết tới tài liệu (chunk đã xóa hoặc thiếu dữ liệu)"
      >
        [{label}]
      </span>
    );
  }
  return (
    <Link href={href} className={citationBadgeClass} title="Xem chunk trong Document Viewer">
      [{label}]
    </Link>
  );
}

function AnswerBubble({
  text,
  citations,
  confidence,
  noSources,
  citationHref,
  onFollowUp,
  tcEditorHref,
}: {
  text: string;
  citations?: Citation[];
  confidence?: "normal" | "low";
  noSources?: boolean;
  citationHref: (c: Citation) => string | null;
  onFollowUp: () => void;
  tcEditorHref: string;
}) {
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const { excerptCount, docCount } = useMemo(() => countSources(citations), [citations]);

  const bg = noSources
    ? "border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30"
    : "border-zinc-200/70 bg-white dark:border-zinc-800 dark:bg-zinc-950/20";

  return (
    <div className={["max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-relaxed", bg].join(" ")}>
      {noSources ? (
        <p className="font-semibold text-amber-900 dark:text-amber-200">
          Không tìm thấy thông tin liên quan trong tài liệu dự án
        </p>
      ) : null}

      <div
        className="prose prose-zinc mt-1 max-w-none text-[14px] leading-relaxed dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: safeMarked(text) }}
      />

      {confidence === "low" ? (
        <p className="mt-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Lưu ý: thông tin có thể chưa đầy đủ
        </p>
      ) : null}

      {citations?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {citations.map((c) => (
            <CitationBadge key={c.id} href={citationHref(c)} label={c.label} />
          ))}
        </div>
      ) : null}

      <div className="mt-3 border-t border-zinc-200/70 pt-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => setSourcesOpen((v) => !v)}
          className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          disabled={!citations?.length}
        >
          Nguồn tham khảo: {excerptCount} đoạn từ {docCount} tài liệu {citations?.length ? (sourcesOpen ? "▲" : "▼") : ""}
        </button>

        {sourcesOpen && citations?.length ? (
          <div className="mt-2 space-y-2">
            {citations.map((c) => {
              const href = citationHref(c);
              const rowClass =
                "block rounded-xl border border-zinc-200 bg-white/60 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 dark:text-zinc-300 dark:hover:bg-zinc-800/30";
              return href ? (
                <Link key={c.id} href={href} className={rowClass}>
                  {c.label}
                </Link>
              ) : (
                <span
                  key={c.id}
                  className={`${rowClass} cursor-not-allowed opacity-60 hover:bg-white/60 dark:hover:bg-zinc-950/10`}
                  title="Không có liên kết tới tài liệu"
                >
                  {c.label}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onFollowUp}
            className="rounded-lg border border-zinc-200 bg-white/70 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
          >
            Hỏi tiếp
          </button>
          <Link
            href={`${tcEditorHref}&source=answer&text=${encodeURIComponent(text)}`}
            className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-800 transition hover:bg-violet-100 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200 dark:hover:bg-violet-950/60"
          >
            Tạo TC từ câu trả lời này
          </Link>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
            } catch {
              // ignore
            }
          }}
          className="rounded-lg border border-zinc-200 bg-white/70 px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/20 dark:text-zinc-300 dark:hover:bg-zinc-800/30"
          aria-label="Copy answer"
          title="Copy"
        >
          Copy
        </button>
      </div>
    </div>
  );
}

export function ChatClient({
  projectId,
  initialScreen,
  initialDocId,
  initialChunkId,
  initialQuestion,
}: {
  projectId?: string;
  initialScreen?: ScreenKey;
  initialDocId?: string;
  initialChunkId?: string;
  initialQuestion?: string;
}) {
  const [scopeMode, setScopeMode] = useState<ScopeMode>(initialScreen ? "screen" : "project");
  const [screen, setScreen] = useState<ScreenKey>(initialScreen ?? "login");
  const [docTypes, setDocTypes] = useState<Record<DocType, boolean>>({
    basic_design: true,
    api_design: true,
    detail_design: true,
    figma: false,
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? conversations[0],
    [conversations, activeConversationId],
  );

  const [input, setInput] = useState<string>(initialQuestion ?? "");
  const [sending, setSending] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  function errMessage(e: unknown): string {
    const ax = e as AxiosError<{ message?: string; error?: string }>;
    return ax.response?.data?.message || ax.response?.data?.error || ax.message || "Không thể gọi API.";
  }

  function mapCitation(c: CitationOut): Citation {
    return {
      id: `${c.chunk_id ?? "none"}:${c.index ?? 0}`,
      label: c.badge_text ?? "citation",
      docId: (c.document_id && String(c.document_id).trim()) || "",
      versionId: (c.version_id && String(c.version_id).trim()) || undefined,
      chunkId: (c.chunk_id && String(c.chunk_id).trim()) || undefined,
    };
  }

  function mapMessage(m: MessageOut): Message {
    return {
      id: m.id,
      role: m.role === "assistant" ? "ai" : "user",
      text: m.content ?? "",
      citations: Array.isArray(m.citations) ? m.citations.map(mapCitation) : [],
      createdAt: m.created_at ? Date.parse(m.created_at) : 0,
      noSources: m.role === "assistant" && (!m.citations || m.citations.length === 0),
      confidence: "normal",
    };
  }

  async function loadConversationMessages(conversationId: string) {
    const data = await fetchConversationMessages({ conversationId });
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, messages: data.messages.map(mapMessage) } : c)),
    );
    try {
      const sug = await fetchSuggestedQuestions(conversationId);
      // If user hasn't interacted yet, show chips.
      if (!hasInteracted) {
        setSuggestedQuestions(sug.questions ?? []);
      }
    } catch {
      // ignore
    }
  }

  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    // Defer async state updates to avoid sync setState in effect body.
    queueMicrotask(() => {
      if (cancelled) return;
      setLoadError(null);
      fetchConversations({ projectId })
        .then((data) => {
          if (cancelled) return;
          const convs: Conversation[] = data.conversations.map((c: ConversationListItem) => ({
            id: c.id,
            title: c.title ?? "Chat mới",
            createdAt: c.created_at ? Date.parse(c.created_at) : 0,
            messages: [],
          }));
          setConversations(convs);
          const first = convs[0]?.id;
          if (first) {
            setActiveConversationId(first);
            void loadConversationMessages(first);
          }
        })
        .catch((e) => {
          if (cancelled) return;
          setLoadError(errMessage(e));
        });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!activeConversationId) return;
    const conv = conversations.find((c) => c.id === activeConversationId);
    if (!conv) return;
    if (conv.messages.length > 0) return;
    queueMicrotask(() => {
      void loadConversationMessages(activeConversationId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConversationId, conversations]);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages.length, sending]);

  function startNewChat() {
    if (!projectId) return;
    setHasInteracted(false);
    setSuggestedQuestions([]);
    const body =
      scopeMode === "project"
        ? { scope_type: "project" as const }
        : scopeMode === "screen"
          ? { scope_type: "screen" as const, screen_name: screenLabel[screen] }
          : {
              scope_type: "doc_type" as const,
              doc_types: Object.entries(docTypes)
                .filter(([, v]) => v)
                .map(([k]) => k),
            };
    createConversation({ projectId, body })
      .then((res) => {
        const c: Conversation = {
          id: res.id,
          title: res.title ?? "Chat mới",
          createdAt: res.created_at ? Date.parse(res.created_at) : 0,
          messages: [],
        };
        setConversations((prev) => [c, ...prev]);
        setActiveConversationId(c.id);
        setSuggestedQuestions(res.suggested_questions ?? []);
      })
      .catch((e) => setLoadError(errMessage(e)));
  }

  async function sendQuestion(q: string) {
    if (!q.trim() || sending) return;
    if (!projectId) {
      setLoadError("Thiếu projectId trên URL. Hãy mở `/chat?projectId=<id>`.");
      return;
    }
    setHasInteracted(true);
    setSending(true);

    let conv = activeConversation;
    if (!conv) {
      try {
        const body =
          scopeMode === "project"
            ? { scope_type: "project" as const }
            : scopeMode === "screen"
              ? { scope_type: "screen" as const, screen_name: screenLabel[screen] }
              : {
                  scope_type: "doc_type" as const,
                  doc_types: Object.entries(docTypes)
                    .filter(([, v]) => v)
                    .map(([k]) => k),
                };
        const created = await createConversation({ projectId, body });
        const c: Conversation = {
          id: created.id,
          title: created.title ?? "Chat mới",
          createdAt: created.created_at ? Date.parse(created.created_at) : 0,
          messages: [],
        };
        setConversations((prev) => [c, ...prev]);
        setActiveConversationId(c.id);
        setSuggestedQuestions(created.suggested_questions ?? []);
        conv = c;
      } catch (e) {
        setLoadError(errMessage(e));
        setSending(false);
        return;
      }
    }

    const lastTs = conv.messages.at(-1)?.createdAt ?? 0;
    const userTs = lastTs + 1000;
    const aiTs = lastTs + 2000;
    const userMsg: Message = { id: makeId("msg"), role: "user", text: q.trim(), createdAt: userTs };
    const tmpAiId = makeId("tmp_ai");
    const tmpAi: Message = { id: tmpAiId, role: "ai", text: "", createdAt: aiTs, confidence: "normal" };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conv.id ? { ...c, messages: [...c.messages, userMsg, tmpAi] } : c,
      ),
    );
    setInput("");
    try {
      const res = await sendConversationMessage({
        conversationId: conv.id,
        body: { content: q.trim(), stream: false },
      });
      const assistantMsg: Message = {
        id: res.assistant_message.id,
        role: "ai",
        text: res.assistant_message.content,
        createdAt: res.assistant_message.created_at ? Date.parse(res.assistant_message.created_at) : aiTs,
        citations: (res.assistant_message.citations ?? []).map(mapCitation),
        noSources: (res.assistant_message.citations ?? []).length === 0,
        confidence: (res.assistant_message.citations ?? []).length === 0 ? "low" : "normal",
      };
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                title: c.title || res.conversation_title || c.title,
                messages: [...c.messages.filter((m) => m.id !== tmpAiId), assistantMsg],
              }
            : c,
        ),
      );
    } catch (e) {
      setLoadError(errMessage(e));
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, messages: c.messages.filter((m) => m.id !== tmpAiId) } : c)),
      );
    }
    setSending(false);
  }

  const groupedHistory = useMemo(() => {
    const map = new Map<string, Conversation[]>();
    for (const c of conversations) {
      const k = dayLabel(c.createdAt);
      const arr = map.get(k) ?? [];
      arr.push(c);
      map.set(k, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [conversations]);

  const suggested = suggestedQuestions.length ? suggestedQuestions : [
    "Luồng login redirect theo role là gì?",
    "Thông điệp lỗi login chuẩn là gì?",
    "Checklist UI elements màn Login?",
  ];

  function citationHref(c: Citation): string | null {
    if (!c.docId) return null;
    const base = `/documents/${encodeURIComponent(c.docId)}/viewer`;
    const qs = new URLSearchParams();
    if (projectId) qs.set("projectId", projectId);
    if (c.versionId) qs.set("v", c.versionId);
    if (c.chunkId) qs.set("chunkId", c.chunkId);
    const q = qs.toString();
    return q ? `${base}?${q}` : base;
  }

  const tcEditorHrefBase = useMemo(() => {
    const qs = new URLSearchParams();
    if (projectId) qs.set("projectId", projectId);
    if (initialDocId) qs.set("docId", initialDocId);
    if (initialChunkId) qs.set("chunkId", initialChunkId);
    return `/testcases/editor?${qs.toString()}`;
  }, [projectId, initialDocId, initialChunkId]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto w-full max-w-7xl px-6 py-8">
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="border-b border-zinc-200/70 px-4 py-4 dark:border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Q&A Chat</p>
                  <button
                    type="button"
                    onClick={startNewChat}
                    className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-500 active:bg-violet-700"
                  >
                    + Chat mới
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Scope</p>

                  <div className="mt-2 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "project"}
                        onChange={() => setScopeMode("project")}
                        className="h-4 w-4 accent-violet-600"
                      />
                      Toàn project
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "screen"}
                        onChange={() => setScopeMode("screen")}
                        className="h-4 w-4 accent-violet-600"
                      />
                      Màn hình cụ thể
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="scope"
                        checked={scopeMode === "doc_type"}
                        onChange={() => setScopeMode("doc_type")}
                        className="h-4 w-4 accent-violet-600"
                      />
                      Loại tài liệu cụ thể
                    </label>
                  </div>

                  {scopeMode === "screen" ? (
                    <div className="mt-3">
                      <select
                        value={screen}
                        onChange={(e) => setScreen(e.target.value as ScreenKey)}
                        className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                      >
                        {(["login", "dashboard", "documents", "diff_viewer", "chat"] as const).map((s) => (
                          <option key={s} value={s}>
                            {screenLabel[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {scopeMode === "doc_type" ? (
                    <div className="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {(Object.keys(docTypes) as DocType[]).map((t) => (
                        <label key={t} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={docTypes[t]}
                            onChange={(e) =>
                              setDocTypes((m) => ({ ...m, [t]: e.target.checked }))
                            }
                            className="h-4 w-4 accent-violet-600"
                          />
                          {docTypeLabel[t]}
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="px-4 py-4">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">History</p>
                <div className="mt-3 space-y-4">
                  {groupedHistory.map(([day, list]) => (
                    <div key={day}>
                      <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">{day}</p>
                      <div className="mt-2 space-y-2">
                        {list.map((c) => {
                          const active = c.id === activeConversationId;
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setActiveConversationId(c.id);
                                if (c.messages.length === 0) void loadConversationMessages(c.id);
                              }}
                              className={[
                                "w-full rounded-xl border px-3 py-3 text-left transition",
                                active
                                  ? "border-violet-200 bg-violet-50 dark:border-violet-900/60 dark:bg-violet-950/30"
                                  : "border-zinc-200 bg-white/60 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/10 dark:hover:bg-zinc-800/30",
                              ].join(" ")}
                            >
                              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                                {c.title}
                              </p>
                              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                                {c.messages.length} messages
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <main className="col-span-12 lg:col-span-9">
            <div className="flex h-[calc(100vh-96px)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/70 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/40">
              <div className="border-b border-zinc-200/70 px-5 py-4 dark:border-zinc-800">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  {activeConversation?.title ?? "Chat"}
                </p>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                  Bấm trích dẫn hoặc mục trong “Nguồn tham khảo” để mở Document Viewer đúng chunk.
                </p>
                {loadError ? (
                  <p className="mt-2 text-xs font-semibold text-red-700 dark:text-red-300">{loadError}</p>
                ) : null}
              </div>

              <div className="flex-1 overflow-auto px-5 py-5">
                <div className="space-y-4">
                  {(activeConversation?.messages ?? []).map((m) => {
                    if (m.role === "user") {
                      return (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[75%] rounded-2xl border border-zinc-200/70 bg-violet-100 px-4 py-3 text-sm leading-relaxed text-zinc-900 dark:border-zinc-800 dark:bg-violet-950/30 dark:text-zinc-50">
                            <p className="whitespace-pre-wrap">{m.text}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className="flex justify-start">
                        <AnswerBubble
                          text={m.text}
                          citations={m.citations}
                          confidence={m.confidence}
                          noSources={m.noSources}
                          citationHref={citationHref}
                          tcEditorHref={tcEditorHrefBase}
                          onFollowUp={() => {
                            setInput("Bạn có thể làm rõ thêm phần này không?");
                          }}
                        />
                      </div>
                    );
                  })}

                  {sending ? (
                    <div className="flex justify-start">
                      <div className="rounded-2xl border border-zinc-200/70 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950/20">
                        <TypingDots />
                      </div>
                    </div>
                  ) : null}

                  <div ref={bottomRef} />
                </div>
              </div>

              <div className="border-t border-zinc-200/70 px-5 py-4 dark:border-zinc-800">
                <div className="flex flex-col gap-3">
                  {!hasInteracted && (activeConversation?.messages.length ?? 0) === 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {suggested.map((s) => (
                        <Chip key={s} onClick={() => sendQuestion(s)}>
                          {s}
                        </Chip>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-end gap-3">
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Hỏi về tài liệu dự án..."
                      rows={1}
                      className="min-h-[44px] flex-1 resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200/60 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-50 dark:focus:ring-violet-900/30"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          sendQuestion(input);
                        }
                      }}
                      disabled={sending}
                    />
                    <button
                      type="button"
                      onClick={() => sendQuestion(input)}
                      disabled={sending || !input.trim()}
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-semibold text-white transition",
                        sending || !input.trim()
                          ? "cursor-not-allowed bg-zinc-300 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          : "bg-violet-600 hover:bg-violet-500 active:bg-violet-700",
                      ].join(" ")}
                    >
                      Gửi
                    </button>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Enter để gửi · Shift+Enter để xuống dòng
                  </p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

