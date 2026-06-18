/**
 * Server -> collaboration-service lifecycle event patterns
 * (`contracts/lifecycle-events.md`). Owner-driven lifecycle (FR-006/FR-023):
 * the Alkemio server owns document identity; the collab service reacts.
 *
 * - `DELETED` (required): emitted at the delete-cascade leaves
 *   (`MemoService.deleteMemo` / `WhiteboardService.deleteWhiteboard`) so the
 *   collab service disconnects clients, releases the room and purges the
 *   metadata + blob. Idempotent downstream.
 * - `CREATED` / `ACCESS_CHANGED` (optional): pre-register metadata /
 *   re-evaluate connected clients.
 */
export enum CollaborationLifecycleEventPattern {
  DELETED = 'document.deleted',
  CREATED = 'document.created',
  ACCESS_CHANGED = 'document.access_changed',
}
