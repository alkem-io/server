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

/**
 * 004 T044 — Denial-reason discriminator carried on `request` events with
 * `outcome:"denied"`. Per the single-emission rule in
 * `contracts/audit-event-service-actor.md`, all SP-path denials except
 * missing-scope ride on a single `request` row with this discriminator,
 * so that `audit-oidc-*` stays one-event-per-operation. Missing-scope
 * denials get their own `scope_denial` event (FR-022, emitted by T068).
 */
export type AuditDenialReason =
  | 'audience_not_admitted'
  | 'bearer_expired'
  | 'bearer_revoked';

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
  /**
   * FR-026 — mirrors `client_id` when `actor_type === "service-client"`;
   * Filebeat/Logstash + the FR-022a audit query filter on this field
   * regardless of how the underlying 003 emitter populated `client_id`.
   */
  service_client_id?: string | null;
  /**
   * FR-020 — present on lifecycle events whose actor is a human admin
   * (`register`, `rotate`, `revoke`, `re_enable`, `scope_update`,
   * `description_update`, `owner_reassignment`, platform-scope catalogue
   * mutations).
   */
  acting_admin_user_id?: string | null;
  /**
   * FR-019 + audit contract — every `request` event carries the GraphQL
   * operation_identifier (operation name OR persisted-query hash) so
   * auditors can join with API traffic logs.
   */
  operation_identifier?: string | null;
  /**
   * Single-emission rule discriminator (see `AuditDenialReason`).
   * Populated on `request` events with `outcome:"denied"`; absent on
   * `outcome:"success"`. Missing-scope denials live on `scope_denial`,
   * NOT here.
   */
  denial_reason?: AuditDenialReason | null;
  correlation_id: string;
  request_id: string;
  timestamp: string;
  error_code?: string | null;
  requested_scope?: string | null;
  granted_scope?: string | null;
  truncated_input?: string | null;
  rp_id?: string | null;
  /**
   * Event-type-specific structured payload per the
   * `contracts/audit-event-service-actor.md` taxonomy. Schema is
   * documented per event_type; consumers tolerate unknown keys.
   */
  payload?: Record<string, unknown> | null;
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
  // 004 T044 — high-volume request taxonomy per
  // `contracts/audit-event-service-actor.md`. `request` is the one-event-
  // per-operation record (success + non-scope denial); `scope_denial`
  // is its FR-022 partner emitted by T068 for missing-scope denials.
  // `token_mint` is the FR-021 record emitted by `oidc-service` AND
  // mirrored locally for resolver-side observability.
  | 'request'
  | 'scope_denial'
  | 'token_mint'
  // 004 T044 — lifecycle taxonomy (1-year ILM index). The lifecycle
  // emitter (T013, `ServiceClientLifecycleAudit`) owns these; listed
  // here so the shared schema accepts them and downstream consumers
  // (FR-022a audit query) can union the two indices behind a single
  // type.
  | 'register'
  | 'rotate'
  | 'revoke'
  | 're_enable'
  | 'cascade_revoke_synchronous'
  | 'cascade_revoke_hydra_cleanup'
  | 'cascade_narrow'
  | 'scope_update'
  | 'description_update'
  | 'owner_reassignment'
  | 'add_platform_scope'
  | 'remove_platform_scope'
  | 'set_platform_scope_baseline_membership'
  | 'token_revoke'
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
