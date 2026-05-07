// audit emitter. PII-/IP-minimal JSON records to stdout in local-dev;

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
  | 'session.regenerated'
  | 'session.refresh.rotated'
  | 'session.refresh.temporarily_unavailable'
  | 'session.refresh_persistent_failure'
  | 'session.ended';

export type AuditInput = Omit<AuditEvent, 'timestamp'> & { timestamp?: string };

export function emitAudit(event: AuditInput): void {
  const record: AuditEvent = {
    ...event,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };
  process.stdout.write(JSON.stringify(record) + '\n');
}
