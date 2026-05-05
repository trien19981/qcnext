export type AiPromptItem = {
  key: string;
  content: string;
};

export type AiPromptListResponse = {
  prompts: AiPromptItem[];
};
