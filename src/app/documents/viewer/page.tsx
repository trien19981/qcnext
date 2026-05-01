import { redirect } from "next/navigation";

/**
 * `/documents/{uuid}/viewer` is the real document viewer.
 * Without a UUID, `/documents/viewer` would otherwise match `[docId]` with docId="viewer"
 * and break API calls like GET /api/v1/documents/viewer/versions (422: invalid UUID).
 */
export default async function DocumentsViewerAliasPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const sp = (await searchParams) ?? {};
  const qs = new URLSearchParams();
  if (sp.projectId?.trim()) qs.set("projectId", sp.projectId.trim());
  const suffix = qs.size ? `?${qs.toString()}` : "";
  redirect(`/documents${suffix}`);
}
