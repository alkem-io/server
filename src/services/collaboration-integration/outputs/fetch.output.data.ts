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
  ownerRef?: string;
  error?: string;
}

export const fetchNotFound = (): FetchOutputData => ({ found: false });

export const fetchError = (error: string): FetchOutputData => ({
  found: false,
  error,
});
