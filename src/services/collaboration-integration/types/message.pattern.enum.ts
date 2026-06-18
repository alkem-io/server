/**
 * The unified collaboration RPC patterns (request/reply), per the frozen
 * cross-repo contract published by the collaboration-service
 * (`collaboration-service/.../contracts/unified-metadata-rmq.md` and
 * `internal/adapter/outbound/metastore/rabbitmq/contract.go`).
 *
 * These replace the two legacy dialects
 * (`collaboration-document-{save,fetch}` and whiteboard `save`/`fetch`),
 * which are retired at the big-bang cutover (kept for now for coexistence).
 */
export enum CollaborationMessagePattern {
  SAVE = 'collaboration-save',
  FETCH = 'collaboration-fetch',
  DELETE = 'collaboration-delete',
  INFO = 'collaboration-info',
}
