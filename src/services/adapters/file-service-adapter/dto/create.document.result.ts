/**
 * Response returned by the Go file-service-go after a successful document creation.
 *
 * `reused` is true when the Go service found an existing file row with the
 * same content (content-hash dedup) in the same `storageBucketId` and returned
 * it as-is. On reuse the caller-supplied `authorizationId` / `tagsetId` are
 * ignored by Go — the existing row's values are authoritative — so the caller
 * must release the pre-created rows to avoid leaking them.
 *
 * Missing `reused` is treated as `false` for backward-compatibility with older
 * Go versions (pre-v0.0.10).
 */
export interface CreateDocumentResult {
  id: string;
  externalID: string;
  mimeType: string;
  size: number;
  reused?: boolean;
}
