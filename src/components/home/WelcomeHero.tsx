import Link from "next/link";
import { site } from "@/lib/site";
import { HealthCheckCard } from "@/features/health";
import { UsersPreviewCard } from "@/features/users";

const highlights = [
  {
    title: "App Router",
    body: "Routing theo thư mục trong `src/app/`, dễ đọc và mở rộng.",
  },
  {
    title: "UI tách riêng",
    body: "Component trang chủ nằm trong `src/components/home/`.",
  },
  {
    title: "Cấu hình tập trung",
    body: "Tên & mô tả site trong `src/lib/site.ts`.",
  },
  {
    title: "HTTP + State",
    body: "Axios trong `src/lib/http/`, Redux trong `src/store/`.",
  },
] as const;

export function WelcomeHero() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-linear-to-b from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.25),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)]"
      />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-sm font-medium tracking-wide text-violet-600 dark:text-violet-400">
          Next.js · TypeScript · Tailwind
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
          Chào mừng đến với{" "}
          <span className="text-violet-600 dark:text-violet-400">{site.name}</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          {site.tagline} {site.description}
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="https://nextjs.org/docs"
            className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Tài liệu Next.js
          </Link>
          <span className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white/80 px-5 py-2.5 text-sm font-medium text-zinc-700 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-300">
            Chỉnh sửa <code className="mx-1 rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">src/app/page.tsx</code>
          </span>
        </div>
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-zinc-200/80 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/60"
            >
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {item.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                {item.body}
              </p>
            </div>
          ))}
          <HealthCheckCard />
          <UsersPreviewCard />
        </div>
      </main>
    </div>
  );
}
