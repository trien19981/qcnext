import { axios } from "./axios";
import type { AxiosError } from "axios";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = {
  ok: false;
  status?: number;
  message: string;
};
export type ApiResult<T> = ApiOk<T> | ApiErr;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

function toApiErr(err: unknown): ApiErr {
  const axErr = err as AxiosError<unknown>;
  const status: number | undefined = axErr.response?.status;

  const data = axErr.response?.data;
  const dataMessage =
    typeof data === "object" && data !== null && "message" in data
      ? (data as { message?: unknown }).message
      : undefined;

  const message =
    (typeof dataMessage === "string" ? dataMessage : undefined) ??
    axErr.message ??
    "Request failed";

  return { ok: false, status, message };
}

export async function requestJson<TResponse, TBody extends JsonValue | undefined>(
  method: HttpMethod,
  path: string,
  body?: TBody,
): Promise<ApiResult<TResponse>> {
  try {
    const res = await axios.request<TResponse>({
      method,
      url: path,
      data: body,
    });
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    return toApiErr(err);
  }
}

export async function getJson<T>(path: string): Promise<ApiResult<T>> {
  try {
    const res = await axios.get<T>(path);
    return { ok: true, data: res.data };
  } catch (err: unknown) {
    return toApiErr(err);
  }
}

