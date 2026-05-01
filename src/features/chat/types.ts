export type Pagination = {
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
};

export type ChatUserBrief = {
  id: string;
  full_name: string;
};

export type ConversationScope = {
  type: "project" | "screen" | "doc_type" | string;
  screen_name: string | null;
  doc_types: string[] | null;
};

export type ConversationListItem = {
  id: string;
  title: string | null;
  scope: ConversationScope;
  message_count: number;
  last_message_at: string | null;
  created_at: string | null;
  created_by: ChatUserBrief;
};

export type ConversationsListResponse = {
  conversations: ConversationListItem[];
  pagination: Pagination;
};

export type CreateConversationBody = {
  scope_type: "project" | "screen" | "doc_type";
  screen_name?: string | null;
  doc_types?: string[] | null;
};

export type CreateConversationResponse = {
  id: string;
  title: string | null;
  scope: ConversationScope;
  suggested_questions: string[];
  has_approved_documents: boolean;
  message_count: number;
  created_at: string | null;
};

export type CitationOut = {
  index: number;
  chunk_id: string | null;
  badge_text: string;
  doc_type: string | null;
  screen: string | null;
  section: string | null;
  document_id: string | null;
  version_id: string | null;
  preview: string | null;
  similarity_score: number | null;
};

export type MessageOut = {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  citations: CitationOut[];
  created_at: string | null;
};

export type ConversationOut = {
  id: string;
  title: string | null;
  scope: ConversationScope;
  created_at: string | null;
};

export type ConversationMessagesResponse = {
  conversation: ConversationOut;
  messages: MessageOut[];
  pagination: Pagination;
};

export type SendMessageBody = {
  content: string;
  stream?: boolean;
};

export type SendMessageResponse = {
  user_message: MessageOut;
  assistant_message: MessageOut;
  conversation_title: string | null;
};

export type SuggestedQuestionsResponse = {
  conversation_id: string;
  scope_label: string;
  questions: string[];
  generated_at: string | null;
};

