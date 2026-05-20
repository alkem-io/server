// audit emitter. PII-/IP-minimal JSON records to stdout in local-dev;

export type AuditOutcome = 'success' | 'failure' | 'warn';

/**
 * FR-026 actor-type discriminator (004). Extends the 003 record shape
 * additively per `specs/004-service-client-credentials/contracts/audit-event-service-actor.md`:
 *
 *   - `user` — human-actor events from interactive flows (cookie
 *     session, authorization_code, refresh_token). Default for any
 *     existing 003 emitter that does not set the field explicitly.
 *   - `service-client` — machine-actor events from the
 *     `client_credentials` flow (token mint, token revoke, service-
 *     principal request).
 *   - `user-deletion-job` — the User-deletion synchronous cascade flow
 *     when it emits lifecycle events on behalf of a deleted owner.
 *
 * 003 consumers tolerate unknown fields, so adding this field does not
 * break existing pipelines; new consumers filter on `actor_type` to
 * partition user vs service traffic without joining `client_id`.
 */
export type AuditActorType = 'user' | 'service-client' | 'user-deletion-job';

export type AuditEvent = {
  event_type: AuditEventType;
  outcome: AuditOutcome;
  /**
   * FR-026 discriminator. Defaults to `"user"` on emit when not
   * supplied — the 003 user-actor path is unchanged.
   */
  actor_type?: AuditActorType;
  sub?: string | null;
  client_id?: string | null;
  correlation_id: string;
  request_id: string;
  timestamp: string;
  error_code?: string | null;
  requested_scope?: string | null;
  granted_scope?: string | null;
  truncated_input?: string | null;
  rp_id?: string | null;
};

export type AuditEventType =
  | 'auth.login.initiated'
  | 'auth.login.completed'
  | 'auth.login.callback_rejected'
  | 'auth.returnTo.rejected'
  | 'auth.bearer.invalid_audience'
  | 'auth.bearer.missing_alkemio_claim'
  | 'auth.bearer.validation_failed'
  // 004 T032 — service-principal admission failures (FR-014, FR-011a,
  // FR-017). Distinct event_types so dashboards can split
  // "service-client disabled at catalogue" from "token explicitly
  // revoked via RFC 7009" without parsing `error_code`.
  | 'auth.bearer.service_client_disabled'
  | 'auth.bearer.token_revoked'
  // FR-024b — cookie-session strategy emits these on invalid-creds
  // resolution (state b) so audit reflects authn failures distinctly from
  // anonymous fall-through.
  | 'auth.cookie.session_terminated'
  | 'auth.cookie.absolute_ttl_exceeded'
  | 'session.regenerated'
  | 'session.refresh.rotated'
  | 'session.refresh.temporarily_unavailable'
  | 'session.refresh_persistent_failure'
  | 'session.ended';

export type AuditInput = Omit<AuditEvent, 'timestamp'> & { timestamp?: string };

export function emitAudit(event: AuditInput): void {
  const record: AuditEvent = {
    ...event,
    actor_type: event.actor_type ?? 'user',
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(record) + '\n');
}
