import { endpoints } from "@/lib/http/endpoints";
import { getJson } from "@/lib/http/api";
import type { HealthResponse } from "./types";

export const healthApi = {
  get: () => getJson<HealthResponse>(endpoints.health),
} as const;

