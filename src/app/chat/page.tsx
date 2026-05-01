import { ChatClient } from "./ChatClient";

export default async function ChatPage({
  searchParams,
}: {
  searchParams?: Promise<{
    projectId?: string;
    screen?: "login" | "dashboard" | "documents" | "diff_viewer" | "chat";
    docId?: string;
    chunkId?: string;
    q?: string;
  }>;
}) {
  const { projectId, screen, docId, chunkId, q } = (await searchParams) ?? {};
  return (
    <ChatClient
      projectId={projectId}
      initialScreen={screen}
      initialDocId={docId}
      initialChunkId={chunkId}
      initialQuestion={q}
    />
  );
}

