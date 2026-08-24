/**
 * Server -> collaboration-service lifecycle event pattern
 * (`contracts/lifecycle-events.md`). Duplicated in the domain layer (the
 * emitter lives here) and mirrored by the integration module's
 * `CollaborationLifecycleEventPattern`; kept as a plain string so the domain
 * layer does not depend on the `services/` layer.
 *
 * `DELETED` is the only owner-driven lifecycle event: its persistent publish is
 * confirmed at the delete-cascade leaves before owner deletion begins.
 */
export enum CollaborationLifecycleEvent {
  DELETED = 'document.deleted',
}
