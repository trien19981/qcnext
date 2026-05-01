import { cookies } from "next/headers";
import { DocumentDetailClient } from "./DocumentDetailClient";

function projectNameFromId(projectId?: string) {
  if (!projectId) return "—";
  if (projectId === "p_qcmaster") return "QC Master";
  if (projectId === "p_castinghub") return "CastingHub";
  if (projectId === "p_legacy") return "Legacy Portal";
  return projectId;
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ docId: string }>;
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const { docId } = await params;
  const { projectId } = (await searchParams) ?? {};
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
    <DocumentDetailClient
      projectId={projectId}
      projectName={projectNameFromId(projectId)}
      docId={docId}
      initialRole={initialRole}
    />
  );
}

