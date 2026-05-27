import { MessagingRejectionReason } from './messaging.rejection.reasons';

/**
 * Internal return type of `MessagingService.createConversationFromExternal`.
 *
 * Distinct from the wire-level `CheckRoomResponse` (from `@alkemio/matrix-adapter-lib`).
 * The controller does a one-line translation between them:
 *   - `{ kind: 'accepted', alkemioRoomId }` → `{ allow: true,  alkemio_room_id }`
 *   - `{ kind: 'rejected', reason }`        → `{ allow: false, reason }`
 *
 * `reason` is typed as `MessagingRejectionReason` (the canonical wire-string
 * union) so off-contract values are a compile error.
 */
export type CheckResult =
  | { kind: 'accepted'; alkemioRoomId: string }
  | { kind: 'rejected'; reason: MessagingRejectionReason };
