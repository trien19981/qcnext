export type ProjectStats = {
  document_count: number;
  testcase_count: number;
};

export type UserBrief = {
  id: string;
  full_name: string;
};

export type ProjectListItem = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  stats: ProjectStats;
  my_role: string;
  created_at: string;
  updated_at: string | null;
  created_by: UserBrief | null;
};

export type Pagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type ProjectListResponse = {
  data: ProjectListItem[];
  pagination: Pagination;
};

export type ProjectCreateBody = {
  name: string;
  slug: string;
  description?: string | null;
};

export type ProjectPatchBody = {
  name?: string;
  description?: string | null;
};

export type ProjectMemberOut = {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  avatar_url: string | null;
  joined_at: string | null;
};

export type ProjectStatsWithMembers = ProjectStats & {
  member_count: number;
};

export type ProjectDetail = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  stats: ProjectStatsWithMembers;
  my_role: string;
  members: ProjectMemberOut[];
  created_at: string;
  updated_at: string | null;
  created_by: UserBrief | null;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
  status_code?: number;
  field?: string;
};
