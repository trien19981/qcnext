import { endpoints } from "@/lib/http/endpoints";
import { getJson, requestJson, type ApiResult } from "@/lib/http/api";
import type {
  CreateUserBody,
  ListUsersResponse,
  UpdateUserBody,
  User,
} from "./types";

export const usersApi = {
  list: () => getJson<ListUsersResponse>(endpoints.users.list),
  getById: (id: string) => getJson<User>(endpoints.users.detail(id)),
  create: (body: CreateUserBody) =>
    requestJson<User, CreateUserBody>("POST", endpoints.users.list, body),
  update: (id: string, body: UpdateUserBody) =>
    requestJson<User, UpdateUserBody>("PATCH", endpoints.users.detail(id), body),
  remove: (id: string): Promise<ApiResult<{ ok: true }>> =>
    requestJson<{ ok: true }, undefined>("DELETE", endpoints.users.detail(id)),
} as const;

