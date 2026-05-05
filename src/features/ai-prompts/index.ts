export type { AiPromptItem, AiPromptListResponse } from "./types";
export { deleteAiPromptOverride, fetchAiPrompts, patchAiPrompt } from "./api";

export const AI_PROMPT_META: { key: string; title: string; hint: string }[] = [
  {
    key: "qa_answer_system",
    title: "Q&A — System prompt",
    hint: "Dùng cho câu trả lời chat; không cần placeholder. Khớp CONTEXT + CITATION_i trong user message.",
  },
  {
    key: "qa_suggested_questions_user",
    title: "Q&A — Câu hỏi gợi ý (user message)",
    hint: "Nên chứa {context} để chèn đoạn tài liệu seed. Nếu thiếu, hệ thống tự nối khối --- ... ---.",
  },
  {
    key: "tc_generate_prompt",
    title: "Generate testcase (user message)",
    hint: "Nên chứa {context} cho nội dung chunk đã duyệt. Nếu thiếu, hệ thống tự thêm khối [TÀI LIỆU].",
  },
];
