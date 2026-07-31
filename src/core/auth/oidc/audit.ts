// audit emitter. PII-/IP-minimal JSON records to stdout in local-dev;

import type { SessionRevocationReason } from './revocation/session-revocation.types';

export type AuditOutcome = 'success' | 'failure' | 'warn';

export type AuditEvent = {
  event_type: AuditEventType;
  outcome: AuditOutcome;
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
  // server#6315 — closed-set cause of a subject-scoped revocation. Present only
  // on the `session.revocation.*` / `session.revoked` event types.
  reason?: SessionRevocationReason | null;
};

export type AuditEventType =
  | 'auth.login.initiated'
  | 'auth.login.completed'
  | 'auth.login.callback_rejected'
  | 'auth.returnTo.rejected'
  | 'auth.bearer.invalid_audience'
  | 'auth.bearer.missing_alkemio_claim'
  | 'auth.bearer.validation_failed'
  // FR-024b — cookie-session strategy emits these on invalid-creds
  // resolution (state b) so audit reflects authn failures distinctly from
  // anonymous fall-through.
  | 'auth.cookie.session_terminated'
  | 'auth.cookie.absolute_ttl_exceeded'
  // server#6315 — the subject-level revocation marker rejected this request.
  // Distinct from `session_terminated`, which means this session's own payload
  // carries a tombstone. This one fires when the payload looks healthy but the
  // subject was revoked after the session was minted: the resurrected-tombstone
  // race and the never-indexed (pre-deployment) population.
  | 'auth.cookie.subject_revoked'
  | 'session.regenerated'
  | 'session.refresh.rotated'
  | 'session.refresh.temporarily_unavailable'
  | 'session.refresh_persistent_failure'
  | 'session.ended'
  // server#6315 — subject-scoped revocation (account deleted, password
  // changed, admin force-revoke, …). These records are the ISO 27001 A.5.18 /
  // A.8.15 and SOC 2 CC6.2 evidence that access was actually removed.
  //
  // Deliberately NOT folded into `session.ended`: that one means the holder
  // signed themselves out. Overloading it would destroy the distinction
  // between voluntary sign-out and enforced revocation — which is precisely
  // the distinction an auditor is looking for.
  | 'session.revocation.initiated'
  | 'session.revoked'
  | 'session.revocation.completed';

export type AuditInput = Omit<AuditEvent, 'timestamp'> & { timestamp?: string };

export function emitAudit(event: AuditInput): void {
  const record: AuditEvent = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(record) + '\n');
}
