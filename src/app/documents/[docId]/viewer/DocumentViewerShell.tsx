"use client";

import dynamic from "next/dynamic";

const DocumentViewerClient = dynamic(
  () => import("./DocumentViewerClient").then((m) => m.DocumentViewerClient),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[50vh] items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
        Đang tải trình xem tài liệu…
      </div>
    ),
  },
);

export function DocumentViewerShell({
  projectId,
  projectName,
  docId,
  initialVersionId,
  initialChunkId,
}: {
  projectId?: string;
  projectName: string;
  docId: string;
  initialVersionId?: string;
  initialChunkId?: string;
}) {
  return (
    <DocumentViewerClient
      projectId={projectId}
      projectName={projectName}
      docId={docId}
      initialVersionId={initialVersionId}
      initialChunkId={initialChunkId}
    />
  );
}
