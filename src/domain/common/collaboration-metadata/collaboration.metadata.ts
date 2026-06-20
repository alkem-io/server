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
  /**
   * The collaboration content version owned by the collab room (the contract
   * `version`, FR-004). Read back from the persisted `contentVersion` column —
   * NOT the inherited TypeORM `@VersionColumn`, which is a server-internal
   * optimistic-locking counter and unrelated to this value.
   */
  version: number;
  contentPointer?: string;
  blobStore?: BlobStoreKind;
  /** the entity's own AuthorizationPolicy.id (= `authorizationId`), FR-005. */
  authorizationPolicyId?: string;
  /**
   * The document's own `profile.storageBucket.id` — where snapshots/blobs for
   * this doc must be stored (its own bucket, not a flat platform bucket).
   */
  storageBucketId?: string;
}

/**
 * The index fields written by a unified `collaboration-save`. The blob never
 * crosses the bus, so this carries only the version + pointer + store (FR-003).
 */
export interface CollaborationMetadataUpdate {
  /**
   * The contract `version` the collab room sends on `collaboration-save`. The
   * server PERSISTS this value verbatim into `contentVersion` so a later
   * `collaboration-fetch` round-trips it back to the room (FR-004); the server
   * does NOT substitute its own counter.
   */
  version: number;
  contentPointer: string;
  blobStore: BlobStoreKind;
}
