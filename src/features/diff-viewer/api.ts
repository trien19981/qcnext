import { axios } from "@/lib/http/axios";
import { endpoints } from "@/lib/http/endpoints";

import type {
  DiffHistoryResponse,
  DiffReviewStatusResponse,
  GetDocumentDiffResponse,
  PatchDiffChangeBody,
  PatchDiffChangeResponse,
  SubmitDiffReviewBody,
  SubmitDiffReviewResponse,
} from "./types";

export async function fetchDocumentDiff(params: {
  documentId: string;
  old_version_id?: string;
  new_version_id?: string;
}): Promise<{ status: number; data: GetDocumentDiffResponse }> {
  const res = await axios.get<GetDocumentDiffResponse>(endpoints.documents.diff(params.documentId), {
    params: {
      old_version_id: params.old_version_id ?? undefined,
      new_version_id: params.new_version_id ?? undefined,
    },
    validateStatus: () => true, // accept 202 polling responses
  });
  return { status: res.status, data: res.data };
}

export async function fetchDiffReview(diffReviewId: string): Promise<{ status: number; data: GetDocumentDiffResponse }> {
  const res = await axios.get<GetDocumentDiffResponse>(endpoints.diffViewer.diffReview(diffReviewId), {
    validateStatus: () => true, // may return 202 while processing
  });
  return { status: res.status, data: res.data };
}

export async function fetchDiffReviewStatus(diffReviewId: string): Promise<DiffReviewStatusResponse> {
  const { data } = await axios.get<DiffReviewStatusResponse>(endpoints.diffViewer.diffReviewStatus(diffReviewId));
  return data;
}

export async function patchDiffChange(changeId: string, body: PatchDiffChangeBody): Promise<PatchDiffChangeResponse> {
  const { data } = await axios.patch<PatchDiffChangeResponse>(endpoints.diffViewer.diffChange(changeId), body);
  return data;
}

export async function submitDiffReview(
  diffReviewId: string,
  body: SubmitDiffReviewBody,
): Promise<SubmitDiffReviewResponse> {
  const { data } = await axios.post<SubmitDiffReviewResponse>(endpoints.diffViewer.diffSubmit(diffReviewId), body);
  return data;
}

export async function approveAllDiffReview(
  diffReviewId: string,
  body: SubmitDiffReviewBody,
): Promise<SubmitDiffReviewResponse> {
  const { data } = await axios.post<SubmitDiffReviewResponse>(endpoints.diffViewer.diffApproveAll(diffReviewId), body);
  return data;
}

export async function fetchDiffHistory(documentId: string): Promise<DiffHistoryResponse> {
  const { data } = await axios.get<DiffHistoryResponse>(endpoints.documents.diffHistory(documentId));
  return data;
}

