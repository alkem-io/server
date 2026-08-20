/**
 * Server -> collaboration-service lifecycle event pattern
 * (`contracts/lifecycle-events.md`). Owner-driven lifecycle (FR-006/FR-023):
 * the Alkemio server owns document identity; the collab service reacts.
 *
 * `DELETED` is the only lifecycle event: emitted at the delete-cascade leaves
 * (`MemoService.deleteMemo` / `WhiteboardService.deleteWhiteboard`) so the
 * collab service disconnects clients, releases the room and purges the live
 * session. Recorded in the transactional lifecycle outbox and delivered with a
 * confirmed persistent publish on the dedicated lifecycle queue. Idempotent
 * downstream.
 */
export enum CollaborationLifecycleEventPattern {
  DELETED = 'document.deleted',
}
