/**
 * Canonical rejection-reason strings emitted by `MessagingService.createConversationFromExternal`.
 *
 * The matrix-adapter surfaces these verbatim to Element users. No machine-readable code
 * is required by the wire contract — the adapter spec
 * (`alkem-io/matrix-adapter-go specs/050-element-room-check`) explicitly chose
 * human-readable strings.
 *
 * Domain code references the constant; tests assert against the constant rather than
 * the raw string so wording refactors stay a single-file edit.
 */
export const MessagingRejectionReason = {
  ACTOR_NOT_FOUND: 'actor not found',
  MESSAGING_DISABLED: 'messaging disabled for the target user',
  NO_RECIPIENTS_ALLOW_MESSAGING: 'no recipients allow messaging',
  DUPLICATE_DIRECT_CONVERSATION:
    'a direct conversation between these users already exists',
  MALFORMED_REQUEST: 'malformed check request',
  INTERNAL_ERROR: 'internal error',
} as const;

export type MessagingRejectionReason =
  (typeof MessagingRejectionReason)[keyof typeof MessagingRejectionReason];
