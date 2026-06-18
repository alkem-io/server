/**
 * Server -> collaboration-service lifecycle event patterns
 * (`contracts/lifecycle-events.md`). Duplicated in the domain layer (the
 * emitter lives here) and mirrored by the integration module's
 * `CollaborationLifecycleEventPattern`; kept as plain strings so the domain
 * layer does not depend on the `services/` layer.
 */
export enum CollaborationLifecycleEvent {
  DELETED = 'document.deleted',
  CREATED = 'document.created',
  ACCESS_CHANGED = 'document.access_changed',
}
