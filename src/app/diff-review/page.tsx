import { cookies } from "next/headers";
import { DiffViewerClient } from "./DiffViewerClient";

function projectNameFromId(projectId?: string) {
  if (!projectId) return "—";
  if (projectId === "p_qcmaster") return "QC Master";
  if (projectId === "p_castinghub") return "CastingHub";
  if (projectId === "p_legacy") return "Legacy Portal";
  return projectId;
}

export default async function DiffReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; docId?: string; from?: string; to?: string }>;
}) {
  const { projectId, docId, from, to } = (await searchParams) ?? {};
  const c = await cookies();
  const rawRole = (c.get("qc_role")?.value ?? "").toLowerCase();
  const initialRole =
    rawRole === "admin"
      ? "admin"
      : rawRole === "pm/ba" || rawRole === "pm"
        ? "pm"
        : rawRole === "qc/tester" || rawRole === "qc"
          ? "qc"
          : "dev";

  return (
    <DiffViewerClient
      projectId={projectId}
      projectName={projectNameFromId(projectId)}
      docId={docId}
      docTitle="Documents"
      initialRole={initialRole}
      initialFrom={from}
      initialTo={to}
    />
  );
}

