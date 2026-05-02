import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";

import type {
  TestcaseBulkResponse,
  TestcaseDeleteResponse,
  TestcaseGenerateAccepted,
  TestcaseGenerateJobStatusResponse,
  TestcaseListResponse,
  TestcaseScreensResponse,
  TestcaseStatsResponse,
} from "./types";

export type ListTestcasesParams = {
  projectId: string;
  screen?: string;
  tc_type?: string;
  priority?: string;
  /** Comma-separated e.g. active,draft,archived */
  status?: string;
  needs_review?: boolean;
  search?: string;
  page?: number;
  per_page?: number;
  sort_by?: "created_at" | "updated_at" | "priority";
  sort_dir?: "asc" | "desc";
};

export async function fetchProjectTestcases(params: ListTestcasesParams): Promise<TestcaseListResponse> {
  const { data } = await axios.get<TestcaseListResponse>(endpoints.projectTestcases.list(params.projectId), {
    params: {
      screen: params.screen || undefined,
      tc_type: params.tc_type || undefined,
      priority: params.priority || undefined,
      status: params.status || undefined,
      needs_review: params.needs_review === undefined ? undefined : params.needs_review,
      search: params.search?.trim() || undefined,
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      sort_by: params.sort_by ?? "updated_at",
      sort_dir: params.sort_dir ?? "desc",
    },
  });
  return data;
}

export async function fetchProjectTestcaseScreens(projectId: string): Promise<TestcaseScreensResponse> {
  const { data } = await axios.get<TestcaseScreensResponse>(endpoints.projectTestcases.screens(projectId));
  return data;
}

export async function fetchProjectTestcaseStats(projectId: string): Promise<TestcaseStatsResponse> {
  const { data } = await axios.get<TestcaseStatsResponse>(endpoints.projectTestcases.stats(projectId));
  return data;
}

export async function postTestcaseGenerate(params: {
  projectId: string;
  screen_name: string;
  doc_types: string[];
  tc_type: "manual" | "api" | "e2e";
  overwrite_existing?: boolean;
}): Promise<TestcaseGenerateAccepted> {
  const { data } = await axios.post<TestcaseGenerateAccepted>(endpoints.projectTestcases.generate(params.projectId), {
    screen_name: params.screen_name,
    doc_types: params.doc_types,
    tc_type: params.tc_type,
    overwrite_existing: params.overwrite_existing ?? false,
  });
  return data;
}

export async function fetchTestcaseGenerateJobStatus(
  projectId: string,
  jobId: string,
): Promise<TestcaseGenerateJobStatusResponse> {
  const { data } = await axios.get<TestcaseGenerateJobStatusResponse>(
    endpoints.projectTestcases.generateJobStatus(projectId, jobId),
  );
  return data;
}

export async function patchTestcasesBulk(params: {
  projectId: string;
  action: "archive" | "delete" | "set_priority" | "mark_reviewed";
  testcase_ids: string[];
  priority?: "critical" | "high" | "medium" | "low";
}): Promise<TestcaseBulkResponse> {
  const body: Record<string, unknown> = {
    action: params.action,
    testcase_ids: params.testcase_ids,
  };
  if (params.action === "set_priority" && params.priority) body.priority = params.priority;
  const { data } = await axios.patch<TestcaseBulkResponse>(endpoints.projectTestcases.bulk(params.projectId), body);
  return data;
}

export async function deleteTestcase(testcaseId: string): Promise<TestcaseDeleteResponse> {
  const { data } = await axios.delete<TestcaseDeleteResponse>(endpoints.testcaseDelete(testcaseId));
  return data;
}
