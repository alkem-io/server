/**
 * Fields the Go file-service-go accepts on PATCH /internal/file/:id.
 * MIME type stays immutable on this endpoint — callers renaming a file
 * are responsible for keeping the extension consistent with the existing
 * MIME type. `displayName` is not part of any uniqueness/dedup index, so
 * renames never conflict at the DB level.
 */
export interface UpdateDocumentInput {
  storageBucketId?: string;
  temporaryLocation?: boolean;
  /**
   * Validated by file-service-go: non-empty/non-whitespace, ≤512 bytes,
   * no path separators (`/` or `\`) or control characters (<0x20 or DEL).
   */
  displayName?: string;
  /**
   * Re-point the document at a new (server-minted) authorization policy
   * (feature 013). Used by the inbound re-home MOVE to mirror conversation-
   * membership auth onto a staging document.
   */
  authorizationId?: string;
  /**
   * Set the owning actor (feature 013) — the original sender on re-home.
   */
  createdBy?: string;
  /**
   * Set or clear the opaque caller reference (feature 013). Kept intact on a
   * re-home MOVE so the document still resolves by-reference.
   */
  externalReference?: string;
}
