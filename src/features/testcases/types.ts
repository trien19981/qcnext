/** Types aligned with qcbe S12 testcase list API (snake_case JSON). */

export type LinkedChunkOut = {
  chunk_id: string;
  document_id: string | null;
  doc_type: string;
  section: string | null;
  is_primary: boolean;
};

export type TestcaseUserBrief = {
  id: string;
  full_name: string;
};

export type TestcaseListItem = {
  id: string;
  tc_id: string;
  project_id: string;
  screen_name: string;
  title: string;
  tc_type: string;
  priority: string;
  status: string;
  needs_review: boolean;
  steps_count: number;
  steps_preview: string[];
  expected_result: string | null;
  linked_chunks: LinkedChunkOut[];
  linked_chunks_count: number;
  created_at: string | null;
  updated_at: string | null;
  created_by: TestcaseUserBrief | null;
};

export type TestcaseListPagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type TestcaseSummaryCounts = {
  total: number;
  needs_review_count: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
};

export type TestcaseListResponse = {
  data: TestcaseListItem[];
  pagination: TestcaseListPagination;
  summary: TestcaseSummaryCounts;
};

export type TestcaseScreenAgg = {
  screen_name: string;
  tc_count: number;
  needs_review_count: number;
};

export type TestcaseScreensResponse = {
  screens: TestcaseScreenAgg[];
  total: number;
};

export type TestcaseStatsResponse = {
  project_id: string;
  total_testcases: number;
  needs_review: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
  by_tc_type: Record<string, number>;
  by_screen: Array<{ screen_name: string; count: number }>;
  coverage: {
    screens_with_tc: number;
    screens_total: number;
    coverage_percent: number;
  };
};

export type TestcaseGenerateAccepted = {
  job_id: string;
  screen_name: string;
  doc_types: string[];
  estimated_tc_count: number;
  estimated_seconds: number;
  message: string;
};

export type TestcaseGenerateJobStatusResponse = {
  job_id: string;
  status: string;
  progress: {
    total_chunks: number;
    processed_chunks: number;
    percentage: number;
  };
  result?: {
    created_count: number;
    testcase_ids: string[];
  } | null;
  error_message?: string | null;
  updated_at?: string | null;
};

export type TestcaseBulkResponse = {
  action: string;
  affected_count: number;
  testcase_ids: string[];
  skipped_ids: string[];
  message: string;
};

export type TestcaseDeleteResponse = {
  message: string;
  testcase_id: string;
  unlinked_chunks: number;
};
