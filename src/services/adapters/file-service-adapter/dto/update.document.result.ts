/**
 * Response returned by the Go file-service-go after a successful document update.
 *
 * `imageWidth` / `imageHeight` are post-rotation pixel dimensions for any
 * `image/*` content (read from the row's cached `content_metadata`,
 * not re-decoded — content didn't change on a metadata-only PATCH).
 * Absent for non-image content.
 */
export interface UpdateDocumentResult {
  id: string;
  storageBucketId: string;
  temporaryLocation: boolean;
  imageWidth?: number;
  imageHeight?: number;
}
