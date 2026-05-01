import { DocumentsClientApi } from "./DocumentsClientApi";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const { projectId } = (await searchParams) ?? {};
  return <DocumentsClientApi projectId={projectId} />;
}

