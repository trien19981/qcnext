import { cookies } from "next/headers";

import { AiPromptsClient } from "./AiPromptsClient";

export default async function AiPromptsPage({
  searchParams,
}: {
  searchParams?: Promise<{ projectId?: string }>;
}) {
  const { projectId } = (await searchParams) ?? {};
  const c = await cookies();
  const rawRole = (c.get("qc_role")?.value ?? "").toLowerCase();
  const initialRole =
    rawRole === "admin"
      ? "admin"
      : rawRole === "owner"
        ? "owner"
        : rawRole === "pm/ba" || rawRole === "pm"
          ? "pm"
          : rawRole === "qc/tester" || rawRole === "qc"
            ? "qc"
            : "dev";

  return <AiPromptsClient projectId={projectId} initialRole={initialRole} />;
}
