import Link from "next/link";
import { site } from "@/lib/site";

type Role = "Admin" | "PM/BA" | "QC/Tester" | "Dev";

type MenuItem = {
  title: string;
  description: string;
  href: string;
  roles: Role[];
  highlights: string[];
};

const allRoles: Role[] = ["Admin", "PM/BA", "QC/Tester", "Dev"];

const menu: MenuItem[] = [
  {
    title: "Document Management",
    description:
      "Upload tài liệu, theo dõi version, và chuẩn bị dữ liệu cho RAG (async 202 + progress).",
    href: "/documents",
    roles: ["Admin", "PM/BA", "QC/Tester", "Dev"],
    highlights: [
      "Upload trả 202 + progress",
      "Version history + status badge",
      "Mở Document Viewer",
    ],
  },
  {
    title: "Diff Viewer & Approve",
    description:
      "Review thay đổi theo kiểu GitHub PR (2 cột), approve/reject ngay tại từng change block.",
    href: "/diff-review",
    roles: ["Admin", "PM/BA"],
    highlights: ["2 cột song song", "Highlight thay đổi", "Approve/Reject theo block"],
  },
  {
    title: "Q&A Chatbot",
    description:
      "Chat theo scope (module/screen), citation clickable dẫn thẳng vào đoạn tài liệu tương ứng.",
    href: "/chat",
    roles: ["Admin", "PM/BA", "QC/Tester", "Dev"],
    highlights: ["Scope selector", "Citation deep-link", "Lưu scope theo session"],
  },
  {
    title: "Testcase Management",
    description:
      "Tạo/edit testcase, link ngược về chunk trong tài liệu; hỗ trợ generate testcase từ selection.",
    href: "/testcases",
    roles: ["Admin", "PM/BA", "QC/Tester"],
    highlights: ["Tạo/edit testcase", "Link chunk ↔ testcase", "Generate từ selection"],
  },
  {
    title: "AI Prompts (theo project)",
    description:
      "Chỉnh prompt Q&A, câu hỏi gợi ý và generate testcase; mở kèm ?projectId=UUID sau khi chọn project.",
    href: "/ai-prompts",
    roles: ["Admin", "PM/BA"],
    highlights: ["System prompt Q&A", "Suggested questions", "TC generate"],
  },
  {
    title: "Project & Members",
    description: "Tạo project, quản lý member và phân quyền theo vai trò.",
    href: "/projects",
    roles: ["Admin"],
    highlights: ["Tạo project", "Mời thành viên", "Phân quyền theo role"],
  },
];

function RolePill({ role, enabled }: { role: Role; enabled: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        enabled
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400",
      ].join(" ")}
    >
      {role}
    </span>
  );
}

function Card({ item }: { item: MenuItem }) {
  const allowed = new Set(item.roles);

  return (
    <Link
      href={item.href}
      className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white/70 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-violet-900/60"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(120,119,198,0.18),transparent)]"
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {item.title}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {item.description}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:bg-violet-950/40 dark:text-violet-200">
            Open
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.highlights.map((h) => (
            <span
              key={h}
              className="inline-flex items-center rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950/30 dark:text-zinc-300"
            >
              {h}
            </span>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
            Roles
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {allRoles.map((r) => (
              <RolePill key={r} role={r} enabled={allowed.has(r)} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ManagementMenu() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.22),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.14),transparent)]"
      />

      <header className="relative z-10 border-b border-zinc-200/70 bg-white/60 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/30">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-wide text-violet-700 dark:text-violet-300">
              {site.name}
            </p>
            <h1 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Management Menu
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-zinc-200 bg-white/70 px-3 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              Demo user: Admin
            </span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Click từng module để đi vào flow chi tiết. Đây là “điểm vào” cho Document, Diff
            Review, Chatbot, và Testcase.
          </p>
          <div className="flex flex-wrap gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900/40">
              Status badge: draft → processing → ready_for_review → approved → rejected
            </span>
            <span className="rounded-full border border-zinc-200 bg-white/70 px-2.5 py-1 dark:border-zinc-800 dark:bg-zinc-900/40">
              Upload: 202 + background job + notify
            </span>
          </div>
        </div>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {menu.map((item) => (
            <Card key={item.href} item={item} />
          ))}
        </section>
      </main>
    </div>
  );
}

