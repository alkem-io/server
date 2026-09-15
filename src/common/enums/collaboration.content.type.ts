/**
 * The single id namespace of the unified collaboration contract carries two
 * content kinds. `contentType` routes a `collaboration-save`/`-fetch` to the
 * right server-side service (memo -> MemoService, whiteboard ->
 * WhiteboardService) and is surfaced in the metadata index + lifecycle events.
 *
 * Persistence/bus-internal — NOT registered as a GraphQL enum.
 */
export enum CollaborationContentType {
  MEMO = 'memo',
  WHITEBOARD = 'whiteboard',
}
