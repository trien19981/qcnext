export type DiffUserBrief = {
  id: string;
  full_name: string | null;
};

export type DiffVersionBrief = {
  id: string;
  version_no: number;
  status: string;
  created_at: string | null;
  created_by_name: string | null;
  changelog_md: string | null;
};

export type DiffReview = {
  id: string;
  document_id: string | null;
  old_version: DiffVersionBrief | null;
  new_version: DiffVersionBrief | null;
  status: "pending" | "processing" | "ready" | "approved" | string;
  is_readonly: boolean;
  ai_summary: string | null;
  total_changes: number;
  approved_count: number;
  rejected_count: number;
  pending_count: number;
  reviewed_at: string | null;
  reviewed_by: DiffUserBrief | null;
  created_at: string | null;
  estimated_seconds: number | null;
};

export type DiffChunk = {
  id: string;
  chunk_index: number | null;
  content_text: string;
  section: string | null;
};

export type DiffAffectedTestcase = {
  id: string;
  title: string;
  priority: string | null;
};

export type DiffChange = {
  id: string;
  change_index: number | null;
  change_type: "modified" | "added" | "removed" | string;
  approval_status: "pending" | "approved" | "rejected" | string;
  chunk_old: DiffChunk | null;
  chunk_new: DiffChunk | null;
  word_diff_old: string | null;
  word_diff_new: string | null;
  similarity_score: number | null;
  affected_testcases: DiffAffectedTestcase[];
  approve_note: string | null;
};

export type GetDocumentDiffResponse = {
  diff_review: DiffReview;
  changes: DiffChange[];
  message?: string | null;
};

export type DiffReviewStatusProgress = {
  total_chunks_old?: number | null;
  total_chunks_new?: number | null;
  processed_pairs?: number | null;
  percentage?: number | null;
};

export type DiffReviewStatusResponse = {
  diff_review_id: string;
  status: "pending" | "processing" | "ready" | "approved" | string;
  progress: DiffReviewStatusProgress | null;
  total_changes: number;
  updated_at: string | null;
};

export type PatchDiffChangeBody = {
  approval_status: "approved" | "rejected" | "pending";
  approve_note?: string;
};

export type PatchDiffChangeResponse = {
  id: string;
  approval_status: "approved" | "rejected" | "pending" | string;
  approved_by: DiffUserBrief | null;
  approved_at: string | null;
  approve_note: string | null;
  diff_review_summary: {
    approved_count: number;
    rejected_count: number;
    pending_count: number;
  };
};

export type SubmitDiffReviewBody = {
  review_note?: string;
};

export type SubmitDiffReviewResponse = {
  diff_review_id: string;
  status: string;
  summary: Record<string, unknown>;
  new_version_status: string | null;
  reembed_job_id: string | null;
  message: string | null;
};

export type DiffHistoryResponse = {
  document_id: string;
  screen_name: string;
  doc_type: string;
  diff_history: Array<{
    diff_review_id: string;
    from_version: { id: string; version_no: number };
    to_version: { id: string; version_no: number };
    approved_at: string | null;
    approved_by: DiffUserBrief | null;
    review_note: string | null;
    total_changes: number;
    changes: Array<{
      id: string;
      change_index: number | null;
      change_type: string;
      section: string | null;
      ai_change_summary: string | null;
      chunk_old_id: string | null;
      chunk_new_id: string | null;
    }>;
  }>;
  total_diff_reviews: number;
};

