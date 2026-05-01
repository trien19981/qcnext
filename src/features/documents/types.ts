export type ApiErrorBody = {
  error?: string;
  message?: string;
  status_code?: number;
  field?: string;
};

export type Pagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type DocType = "basic_design" | "api_design" | "detail_design" | "testcase_manual" | "figma";
export type DocStatus = "draft" | "processing" | "ready_for_review" | "approved" | "rejected";

export type DocUserBrief = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

export type LatestVersion = {
  id: string;
  version_no: number;
  status: DocStatus;
  changelog_md: string | null;
  created_at: string | null;
  created_by: DocUserBrief | null;
  approved_at: string | null;
};

export type DocumentListItem = {
  id: string;
  project_id: string;
  screen_name: string;
  doc_type: DocType;
  description: string | null;
  version_count: number;
  latest_version: LatestVersion;
  created_at: string | null;
  updated_at: string | null;
};

export type DocumentListResponse = {
  data: DocumentListItem[];
  pagination: Pagination;
  has_processing: boolean;
};

export type ScreenCountItem = {
  screen_name: string;
  doc_count: number;
};

export type ScreensResponse = {
  screens: ScreenCountItem[];
  total: number;
};

export type VersionDetail = {
  id: string;
  version_no: number;
  status: DocStatus;
  r2_url: string;
  changelog_md: string | null;
  created_at: string | null;
  created_by: DocUserBrief | null;
  approved_by: { id: string; full_name: string } | null;
  approved_at: string | null;
  chunk_count: number;
  is_latest: boolean;
};

export type VersionsListResponse = {
  document_id: string;
  screen_name: string;
  doc_type: string;
  versions: VersionDetail[];
  total_versions: number;
};

export type DocumentDownloadResponse = {
  download_url: string;
  filename: string;
  content_type: string;
  expires_in: number;
};

export type ExistingDocumentSummary = {
  id: string;
  screen_name: string;
  doc_type: string;
  version_count: number;
  latest_version_no: number;
  latest_status: string;
};

export type UploadDocumentBodyDocument = {
  id: string;
  project_id: string;
  screen_name: string;
  doc_type: string;
  description: string | null;
};

export type UploadDocumentBodyVersion = {
  id: string;
  version_no: number;
  status: DocStatus;
  r2_key: string;
  created_at: string | null;
  changelog_md?: string | null;
};

export type UploadNewDocumentResponse202 = {
  document: UploadDocumentBodyDocument;
  version: UploadDocumentBodyVersion;
  job_id: string | null;
  message: string;
};

export type UploadVersionPreviousVersion = {
  id: string;
  version_no: number;
  status: string;
};

export type UploadVersionBodyVersion = {
  id: string;
  version_no: number;
  status: string;
  r2_key: string;
  changelog_md: string | null;
  created_at: string | null;
};

export type UploadVersionResponse202 = {
  document_id: string;
  version: UploadVersionBodyVersion;
  previous_version: UploadVersionPreviousVersion;
  diff_job_id: string | null;
  embed_job_id: string | null;
  message: string;
};

export type VersionEmbedProgress = {
  total_chunks: number;
  embedded_chunks: number;
  percentage: number;
};

export type VersionStatusResponse = {
  version_id: string;
  version_no: number;
  status: DocStatus;
  chunk_count: number;
  embed_progress: VersionEmbedProgress | null;
  diff_ready: boolean | null;
  diff_review_id: string | null;
  updated_at: string | null;
};

export type ViewerDocument = {
  id: string;
  screen_name: string;
  doc_type: DocType;
  project_id: string;
};

export type ViewerUserBrief = {
  id?: string | null;
  full_name?: string | null;
};

export type ViewerVersion = {
  id: string;
  version_no: number;
  status: DocStatus | string;
  changelog_md: string | null;
  created_at: string | null;
  created_by: ViewerUserBrief | null;
  approved_at: string | null;
};

export type ViewerVersionItem = {
  id: string;
  version_no: number;
  status: DocStatus | string;
  is_current: boolean;
};

export type ViewerChunk = {
  id: string;
  chunk_index: number;
  content_text: string;
  metadata: Record<string, unknown> | null;
  token_count: number | null;
  tc_count: number | null;
};

export type ViewerFigmaFrame = {
  frame_id: string;
  frame_name: string | null;
  figma_url: string | null;
  snapshot_url: string | null;
  synced_at: string | null;
};

export type DocumentViewerResponse = {
  document: ViewerDocument;
  version: ViewerVersion;
  all_versions: ViewerVersionItem[];
  chunks: ViewerChunk[];
  total_chunks: number;
  figma_frames: ViewerFigmaFrame[] | null;
};

export type ChunkOutlineItem = {
  id: string;
  chunk_index: number;
  section: string | null;
  token_count: number | null;
  tc_count: number | null;
};

export type DocumentChunksOutlineResponse = {
  document_id: string;
  version_id: string;
  chunks: ChunkOutlineItem[];
  total: number;
};

export type ChunkTestcase = {
  id: string;
  title: string;
  tc_type: string;
  priority: string;
  status: string;
  steps_count: number;
  link_type: string;
  relevance_score: number;
  is_primary_link: boolean;
  created_by: ViewerUserBrief | null;
  updated_at: string | null;
};

export type ChunkTestcasesResponse = {
  chunk_id: string;
  chunk_preview: string;
  chunk_section: string | null;
  testcases: ChunkTestcase[];
  total: number;
};

