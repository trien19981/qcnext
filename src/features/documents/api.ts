import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";

import type {
  ChunkTestcasesResponse,
  DocumentChunksOutlineResponse,
  DocumentListResponse,
  DocType,
  DocStatus,
  DocumentViewerResponse,
  ScreensResponse,
  VersionsListResponse,
  UploadNewDocumentResponse202,
  UploadVersionResponse202,
  VersionStatusResponse,
} from "./types";

export type ListDocumentsParams = {
  projectId: string;
  doc_type?: DocType;
  screen?: string;
  search?: string;
  status?: DocStatus;
  page?: number;
  per_page?: number;
};

export async function fetchProjectDocuments(params: ListDocumentsParams): Promise<DocumentListResponse> {
  const { data } = await axios.get<DocumentListResponse>(endpoints.documents.list(params.projectId), {
    params: {
      doc_type: params.doc_type ?? undefined,
      screen: params.screen ?? undefined,
      search: params.search?.trim() || undefined,
      status: params.status ?? undefined,
      page: params.page ?? 1,
      per_page: params.per_page ?? 50,
    },
  });
  return data;
}

export async function fetchProjectDocumentScreens(projectId: string): Promise<ScreensResponse> {
  const { data } = await axios.get<ScreensResponse>(endpoints.documents.screens(projectId));
  return data;
}

export async function fetchDocumentVersions(documentId: string): Promise<VersionsListResponse> {
  const { data } = await axios.get<VersionsListResponse>(endpoints.documents.versions(documentId));
  return data;
}

export async function uploadNewDocument(params: {
  projectId: string;
  screen_name: string;
  doc_type: DocType;
  file: File;
  changelog_md?: string;
  description?: string;
  onUploadProgress?: (progress: number) => void;
}): Promise<UploadNewDocumentResponse202> {
  const form = new FormData();
  form.append("screen_name", params.screen_name);
  form.append("doc_type", params.doc_type);
  form.append("file", params.file);
  if (params.changelog_md?.trim()) form.append("changelog_md", params.changelog_md.trim());
  if (params.description) form.append("description", params.description);

  const { data } = await axios.post<UploadNewDocumentResponse202>(endpoints.documents.uploadNew(params.projectId), form, {
    // Let axios set multipart boundary automatically.
    headers: { "Content-Type": undefined },
    onUploadProgress: (evt) => {
      if (!params.onUploadProgress) return;
      const total = evt.total ?? 0;
      const loaded = evt.loaded ?? 0;
      const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
      params.onUploadProgress(pct);
    },
  });
  return data;
}

export async function uploadDocumentVersion(params: {
  documentId: string;
  file: File;
  changelog_md: string;
  onUploadProgress?: (progress: number) => void;
}): Promise<UploadVersionResponse202> {
  const form = new FormData();
  form.append("file", params.file);
  form.append("changelog_md", params.changelog_md);

  const { data } = await axios.post<UploadVersionResponse202>(
    endpoints.documents.uploadVersion(params.documentId),
    form,
    {
      // Let axios set multipart boundary automatically.
      headers: { "Content-Type": undefined },
      onUploadProgress: (evt) => {
        if (!params.onUploadProgress) return;
        const total = evt.total ?? 0;
        const loaded = evt.loaded ?? 0;
        const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
        params.onUploadProgress(pct);
      },
    },
  );
  return data;
}

export async function fetchVersionStatus(params: {
  documentId: string;
  versionId: string;
}): Promise<VersionStatusResponse> {
  const { data } = await axios.get<VersionStatusResponse>(
    endpoints.documents.versionStatus(params.documentId, params.versionId),
  );
  return data;
}

export async function fetchDocumentViewer(params: {
  documentId: string;
  version_id?: string;
  include_tc_count?: boolean;
}): Promise<DocumentViewerResponse> {
  const { data } = await axios.get<DocumentViewerResponse>(endpoints.documents.viewer(params.documentId), {
    params: {
      version_id: params.version_id ?? undefined,
      include_tc_count: params.include_tc_count ?? true,
    },
  });
  return data;
}

export async function fetchDocumentChunksOutline(params: {
  documentId: string;
  version_id?: string;
}): Promise<DocumentChunksOutlineResponse> {
  const { data } = await axios.get<DocumentChunksOutlineResponse>(endpoints.documents.chunksOutline(params.documentId), {
    params: { version_id: params.version_id ?? undefined },
  });
  return data;
}

export async function fetchChunkTestcases(chunkId: string): Promise<ChunkTestcasesResponse> {
  const { data } = await axios.get<ChunkTestcasesResponse>(endpoints.chunks.testcases(chunkId));
  return data;
}

