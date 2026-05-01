import { Suspense } from "react";

import { DocumentViewerShell } from "./DocumentViewerShell";

function projectNameFromId(projectId?: string) {
  if (!projectId) return "—";
  if (projectId === "p_qcmaster") return "QC Master";
  if (projectId === "p_castinghub") return "CastingHub";
  if (projectId === "p_legacy") return "Legacy Portal";
  return projectId;
}

export default async function DocumentViewerPage({
  params,
  searchParams,
}: {
  params: Promise<{ docId: string }>;
  searchParams?: Promise<{ projectId?: string; v?: string; chunkId?: string }>;
}) {
  const { docId } = await params;
  const { projectId, v, chunkId } = (await searchParams) ?? {};

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center bg-zinc-50 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          Đang tải trình xem tài liệu…
        </div>
      }
    >
      <DocumentViewerShell
        key={`${docId}:${chunkId ?? ""}`}
        projectId={projectId}
        projectName={projectNameFromId(projectId)}
        docId={docId}
        initialVersionId={v}
        initialChunkId={chunkId}
      />
    </Suspense>
  );
}
