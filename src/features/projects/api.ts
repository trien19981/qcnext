import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";
import type {
  ProjectCreateBody,
  ProjectDetail,
  ProjectListResponse,
  ProjectPatchBody,
} from "./types";

export type ListProjectsParams = {
  status?: "active" | "archived" | "all";
  search?: string;
  page?: number;
  per_page?: number;
};

export async function fetchProjectList(params: ListProjectsParams = {}): Promise<ProjectListResponse> {
  const { data } = await axios.get<ProjectListResponse>(endpoints.projects.list, {
    params: {
      status: params.status ?? "active",
      search: params.search?.trim() || undefined,
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
    },
  });
  return data;
}

export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
  const { data } = await axios.get<ProjectDetail>(endpoints.projects.detail(id));
  return data;
}

export async function createProject(body: ProjectCreateBody): Promise<ProjectDetail> {
  const { data } = await axios.post<ProjectDetail>(endpoints.projects.list, body);
  return data;
}

export async function patchProject(id: string, body: ProjectPatchBody): Promise<ProjectDetail> {
  const { data } = await axios.patch<ProjectDetail>(endpoints.projects.detail(id), body);
  return data;
}

export async function archiveProject(
  id: string,
  status: "active" | "archived",
): Promise<{ id: string; status: string; message: string }> {
  const { data } = await axios.patch(endpoints.projects.archive(id), { status });
  return data;
}
