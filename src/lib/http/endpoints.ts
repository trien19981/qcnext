export const endpoints = {
  health: "/api/health",

  auth: {
    login: "/api/v1/auth/login",
    refresh: "/api/v1/auth/refresh",
    logout: "/api/v1/auth/logout",
    me: "/api/v1/auth/me",
  },

  users: {
    list: "/api/users",
    detail: (id: string) => `/api/users/${id}`,
    me: "/api/users/me",
  },

  projects: {
    list: "/api/v1/projects",
    detail: (id: string) => `/api/v1/projects/${id}`,
    archive: (id: string) => `/api/v1/projects/${id}/archive`,
  },

  documents: {
    list: (projectId: string) => `/api/v1/projects/${projectId}/documents`,
    screens: (projectId: string) => `/api/v1/projects/${projectId}/documents/screens`,
    versions: (documentId: string) => `/api/v1/documents/${documentId}/versions`,
    uploadNew: (projectId: string) => `/api/v1/projects/${projectId}/documents/upload`,
    uploadVersion: (documentId: string) => `/api/v1/documents/${documentId}/versions`,
    viewer: (documentId: string) => `/api/v1/documents/${documentId}/viewer`,
    chunksOutline: (documentId: string) => `/api/v1/documents/${documentId}/chunks`,
    versionStatus: (documentId: string, versionId: string) =>
      `/api/v1/documents/${documentId}/versions/${versionId}/status`,
    deleteVersion: (documentId: string, versionId: string) =>
      `/api/v1/documents/${documentId}/versions/${versionId}`,
    downloadVersion: (documentId: string, versionId: string) =>
      `/api/v1/documents/${documentId}/versions/${versionId}/download`,
    patch: (documentId: string) => `/api/v1/documents/${documentId}`,
    delete: (documentId: string) => `/api/v1/documents/${documentId}`,
  },

  chunks: {
    testcases: (chunkId: string) => `/api/v1/chunks/${chunkId}/testcases`,
    linkTestcase: (chunkId: string) => `/api/v1/chunks/${chunkId}/testcase-links`,
    unlinkTestcase: (chunkId: string, testcaseId: string) =>
      `/api/v1/chunks/${chunkId}/testcase-links/${testcaseId}`,
  },

  chat: {
    listConversations: (projectId: string) => `/api/v1/projects/${projectId}/chat/conversations`,
    createConversation: (projectId: string) => `/api/v1/projects/${projectId}/chat/conversations`,
    getMessages: (conversationId: string) => `/api/v1/chat/conversations/${conversationId}/messages`,
    sendMessage: (conversationId: string) => `/api/v1/chat/conversations/${conversationId}/messages`,
    deleteConversation: (conversationId: string) => `/api/v1/chat/conversations/${conversationId}`,
    suggestedQuestions: (conversationId: string) =>
      `/api/v1/chat/conversations/${conversationId}/suggested-questions`,
  },
} as const;
