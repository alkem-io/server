/**
 * Response returned by the Go file-service-go after a successful document creation.
 *
 * `reused` is true when the Go service found an existing file row with the
 * same content (content-hash dedup) in the same `storageBucketId` and returned
 * it as-is. On reuse the caller-supplied `authorizationId` / `tagsetId` are
 * ignored by Go — the existing row's values are authoritative — so the caller
 * must release the pre-created rows to avoid leaking them.
 *
 * `imageWidth` / `imageHeight` are post-rotation pixel dimensions populated
 * by file-service-go for any `image/*` content (rasters via vips decode,
 * SVG via viewBox, GIF via canvas dimensions). Absent for non-image
 * content (PDF, video, archives, etc.). Server-side validation that
 * needs accurate dimensions reads these instead of decoding bytes
 * locally — file-service-go already decoded during canonicalization,
 * no second decode needed.
 *
 * Also returned by the copy endpoint (POST /internal/file/copy) — copy
 * reads the source row's cached `content_metadata` and reflects the
 * same dims back without re-decoding the blob.
 */
export interface CreateDocumentResult {
  id: string;
  externalID: string;
  mimeType: string;
  size: number;
  reused: boolean;
  imageWidth?: number;
  imageHeight?: number;
}
