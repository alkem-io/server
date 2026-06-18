import { BlobStoreKind } from '@common/enums/blob.store.kind';

/**
 * The unified collaboration metadata/index projection over a Memo / Whiteboard
 * row (data-model.md §CollaborationMetadata). v1 realizes this as columns on
 * the existing entities, not a new table.
 *
 * Lives in the domain layer (not the integration service) so the memo /
 * whiteboard domain services can produce/consume it without depending on the
 * `services/` layer — the collaboration-integration consumer imports it from
 * here.
 */
export interface CollaborationMetadata {
  version: number;
  contentPointer?: string;
  blobStore?: BlobStoreKind;
  /** the entity's own AuthorizationPolicy.id (= `authorizationId`), FR-005. */
  authorizationPolicyId?: string;
}

/**
 * The index fields written by a unified `collaboration-save`. The blob never
 * crosses the bus, so this carries only the pointer + store (FR-003).
 */
export interface CollaborationMetadataUpdate {
  contentPointer: string;
  blobStore: BlobStoreKind;
}
