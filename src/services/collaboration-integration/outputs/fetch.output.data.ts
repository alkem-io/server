import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { CollaborationContentType } from '../types';

/**
 * `collaboration-fetch` reply (frozen contract `FetchReply`): the index row.
 *
 * `found: false` means no such document (the unified, typed replacement for the
 * legacy `contentBase64 | undefined` and the memo `not_found` code). The blob
 * never crosses this bus — the collab service rehydrates the snapshot from its
 * BlobStore using `contentPointer` + `blobStore`.
 */
export interface FetchOutputData {
  found: boolean;
  contentType?: CollaborationContentType;
  version?: number;
  contentPointer?: string;
  blobStore?: BlobStoreKind;
  /** OPEN-1 / FR-005 — the entity's own AuthorizationPolicy.id. */
  authorizationPolicyId?: string;
  /**
   * The document's own `profile.storageBucket.id` — where snapshots/blobs for
   * THIS document must be stored. Lets the collaboration-service persist each
   * Yjs snapshot into the document's own storage bucket rather than a single
   * flat platform bucket.
   */
  storageBucketId?: string;
  /**
   * The document's stored content for the FIRST-OPEN SEED (R4 / FR-003): the
   * Yjs-V2 snapshot bytes, base64-encoded, matching the collaboration-service
   * `FetchReply.Content` → `Metadata.SeedContent` wire contract. A freshly created
   * document whose content the server persisted but which has no LIVE collab
   * snapshot yet materializes from this on first open instead of opening empty.
   * Omitted (undefined) when the document has no stored content (empty-on-create)
   * so an empty document stays empty + editable (FR-010). A live snapshot is
   * authoritative — the collab service ignores this seed once one exists.
   */
  content?: string;
  ownerRef?: string;
  error?: string;
}

export const fetchNotFound = (): FetchOutputData => ({ found: false });

export const fetchError = (error: string): FetchOutputData => ({
  found: false,
  error,
});
