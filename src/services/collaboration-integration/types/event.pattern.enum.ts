/**
 * The unified collaboration fire-and-forget event patterns.
 *
 * `CONTRIBUTION` is the inbound north-star analytics signal emitted by the
 * collaboration-service (carried forward from the legacy
 * `collaboration-memo-contribution` / whiteboard `contribution` events,
 * unified under a single `id`).
 *
 * The `document.*` lifecycle events are server -> collab (outbound); their
 * pattern strings live in `lifecycle.event.pattern.enum.ts`.
 */
export enum CollaborationEventPattern {
  CONTRIBUTION = 'collaboration-contribution',
}
