import { cookies } from "next/headers";
import { ApproveClient } from "./ApproveClient";

export default async function ApprovePanelPage({
  searchParams,
}: {
  searchParams?: Promise<{
    projectId?: string;
    docId?: string;
    from?: string;
    to?: string;
    mode?: string;
  }>;
}) {
  const { projectId, docId, from, to, mode } = (await searchParams) ?? {};
  const c = await cookies();
  const rawRole = (c.get("qc_role")?.value ?? "").toLowerCase();
  void rawRole; // role enforcement will be done by backend in v1+

  return (
    <ApproveClient
      projectId={projectId}
      docId={docId}
      from={from}
      to={to}
      mode={mode}
    />
  );
}

