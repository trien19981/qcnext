import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";

import type { AiPromptListResponse } from "./types";

export async function fetchAiPrompts(projectId: string): Promise<AiPromptListResponse> {
  const { data } = await axios.get<AiPromptListResponse>(endpoints.aiPrompts.list(projectId));
  return data;
}

export async function patchAiPrompt(projectId: string, promptKey: string, content: string): Promise<void> {
  await axios.patch(endpoints.aiPrompts.item(projectId, promptKey), { content });
}

export async function deleteAiPromptOverride(projectId: string, promptKey: string): Promise<void> {
  await axios.delete(endpoints.aiPrompts.item(projectId, promptKey));
}
