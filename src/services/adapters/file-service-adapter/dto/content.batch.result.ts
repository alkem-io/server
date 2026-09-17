/**
 * One item of the file-service batched content-read response
 * (`POST /internal/file/content-batch`, file-service #52). The endpoint echoes
 * each requested id back at its position (order preserved, duplicates honoured);
 * a missing row / missing blob / malformed id is reported non-fatally with
 * `found: false` and a caller-safe `error`.
 */
export interface ContentBatchItemResult {
  id: string;
  found: boolean;
  /** Present only when `found` — the blob's MIME type (snapshots: octet-stream). */
  mimeType?: string;
  /** Present only when `found` — the content bytes, base64-encoded. */
  contentBase64?: string;
  /** Present only when `!found` — a caller-safe miss reason. */
  error?: string;
}

/** The file-service batched content-read response body. */
export interface ContentBatchResponse {
  items: ContentBatchItemResult[];
}
