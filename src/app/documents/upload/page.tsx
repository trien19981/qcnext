import { UploadClient } from "./UploadClient";

export default async function DocumentUploadPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string; docId?: string }>;
}) {
  const { projectId, docId } = (await searchParams) ?? {};

  return <UploadClient projectId={projectId} docId={docId} />;
}

