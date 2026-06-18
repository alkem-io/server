import { BlobStoreKind } from '@common/enums/blob.store.kind';
import { CollaborationContentType } from '../types';

/**
 * `collaboration-save` request payload — the index row only.
 *
 * Mirrors the frozen contract `SaveData`
 * (`contract.go`): the blob NEVER crosses this bus. `contentPointer` +
 * `blobStore` locate the snapshot in the collaboration-service's BlobStore;
 * for `inline` the pointer is the row id and the snapshot stays in the
 * server's `content` column (written by the collab service's own inline
 * BlobStore through the legacy save path during coexistence).
 */
export interface SaveInputData {
  id: string;
  contentType: CollaborationContentType;
  version: number;
  contentPointer: string;
  blobStore: BlobStoreKind;
  /** OPEN-1; may be '' in open/standalone mode. */
  authorizationPolicyId?: string;
  /** delete-cascade key (FR-023); optional. */
  ownerRef?: string;
}
