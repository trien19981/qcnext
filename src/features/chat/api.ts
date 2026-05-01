import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";

import type {
  ConversationMessagesResponse,
  ConversationsListResponse,
  CreateConversationBody,
  CreateConversationResponse,
  SendMessageBody,
  SendMessageResponse,
  SuggestedQuestionsResponse,
} from "./types";

export async function fetchConversations(params: {
  projectId: string;
  page?: number;
  per_page?: number;
  user_id?: string;
}): Promise<ConversationsListResponse> {
  const { data } = await axios.get<ConversationsListResponse>(endpoints.chat.listConversations(params.projectId), {
    params: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 20,
      user_id: params.user_id ?? undefined,
    },
  });
  return data;
}

export async function createConversation(params: {
  projectId: string;
  body: CreateConversationBody;
}): Promise<CreateConversationResponse> {
  const { data } = await axios.post<CreateConversationResponse>(
    endpoints.chat.createConversation(params.projectId),
    params.body,
  );
  return data;
}

export async function fetchConversationMessages(params: {
  conversationId: string;
  page?: number;
  per_page?: number;
}): Promise<ConversationMessagesResponse> {
  const { data } = await axios.get<ConversationMessagesResponse>(endpoints.chat.getMessages(params.conversationId), {
    params: { page: params.page ?? 1, per_page: params.per_page ?? 50 },
  });
  return data;
}

export async function sendConversationMessage(params: {
  conversationId: string;
  body: SendMessageBody;
}): Promise<SendMessageResponse> {
  const { data } = await axios.post<SendMessageResponse>(endpoints.chat.sendMessage(params.conversationId), params.body);
  return data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await axios.delete(endpoints.chat.deleteConversation(conversationId));
}

export async function fetchSuggestedQuestions(conversationId: string): Promise<SuggestedQuestionsResponse> {
  const { data } = await axios.get<SuggestedQuestionsResponse>(endpoints.chat.suggestedQuestions(conversationId));
  return data;
}

