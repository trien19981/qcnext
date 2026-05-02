import { cookies } from "next/headers";
import { TestcasesClient } from "./TestcasesClient";

export default async function TestcasesPage({
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

  return <TestcasesClient projectId={projectId} initialRole={initialRole} />;
}

