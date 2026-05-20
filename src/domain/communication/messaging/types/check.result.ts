/**
 * Internal return type of `MessagingService.createConversationFromExternal`.
 *
 * Distinct from the wire-level `CheckRoomResponse` (from `@alkemio/matrix-adapter-lib`).
 * The controller does a one-line translation between them:
 *   - `{ kind: 'accepted', alkemioRoomId }` → `{ allow: true,  alkemio_room_id }`
 *   - `{ kind: 'rejected', reason }`        → `{ allow: false, reason }`
 *
 * Rejection reason strings come from `MessagingRejectionReason` (canonical const-map).
 */
export type CheckResult =
  | { kind: 'accepted'; alkemioRoomId: string }
  | { kind: 'rejected'; reason: string };
