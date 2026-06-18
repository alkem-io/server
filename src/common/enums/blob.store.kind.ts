/**
 * Identifies which BlobStore backend holds a collaboration document's encoded
 * snapshot. Persisted on the Memo / Whiteboard rows so a document rehydrates
 * from the correct backend regardless of the collaboration-service's running
 * `BLOB_STORE` config.
 *
 * This is a persistence/bus-internal concept (the metadata/blob split,
 * `contracts/persistence-ports.md`) — it is NOT exposed on the GraphQL schema,
 * so it is intentionally not registered as a GraphQL enum.
 *
 * `inline` is the v1 default: the snapshot stays in the existing `content`
 * column and `contentPointer` equals the row id. The other backends are owned
 * by the collaboration-service's BlobStore; when it offloads, it sends
 * `blobStore != 'inline'` + a `contentPointer` and the server stores only the
 * index.
 */
export enum BlobStoreKind {
  INLINE = 'inline',
  FILE_SERVICE = 'file-service',
  S3 = 's3',
  LOCAL = 'local',
}
