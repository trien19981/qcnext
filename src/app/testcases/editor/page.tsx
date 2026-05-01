import { TestcaseEditorClient } from "./TestcaseEditorClient";

export default async function TestcaseEditorPage({
  searchParams,
}: {
  searchParams?: Promise<{
    projectId?: string;
    docId?: string;
    tcId?: string;
    chunkId?: string;
    text?: string;
    source?: string;
  }>;
}) {
  const { projectId, docId, tcId, chunkId, text, source } = (await searchParams) ?? {};

  return (
    <TestcaseEditorClient
      projectId={projectId}
      docId={docId}
      tcId={tcId}
      chunkId={chunkId}
      text={text}
      source={source}
    />
  );
}

