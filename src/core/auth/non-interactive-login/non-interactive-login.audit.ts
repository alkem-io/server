import { LogContext } from '@common/enums';
import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

// Non-interactive-login audit emitter. Writes JSON-line records to stdout
// in the same shape as the OIDC audit pipeline (`core/auth/oidc/audit.ts`)
// so the deployed log collector (Filebeat → Elasticsearch) ingests both
// uniformly. Every record carries `non_interactive_login: true` so log
// review can grep for it with confidence.
//
// Implemented as an injectable service so the module stays DI-consistent
// and unit tests can substitute a mock. The wire format on stdout is
// identical to the previous free-function implementation — no consumer of
// the audit stream needs to change.

type Outcome = 'success' | 'failure';

type NonInteractiveLoginEventType =
  | 'non_interactive_login.token_minted'
  | 'non_interactive_login.bearer_accepted'
  | 'non_interactive_login.bearer_rejected'
  | 'non_interactive_login.credentials_rejected'
  | 'non_interactive_login.rate_limited'
  | 'non_interactive_login.actor_id_missing'
  | 'non_interactive_login.kratos_unreachable';

export type NonInteractiveLoginAuditInput = {
  event_type: NonInteractiveLoginEventType;
  outcome: Outcome;
  sub?: string | null;
  alkemio_actor_id?: string | null;
  correlation_id?: string;
  request_id?: string;
  error_code?: string | null;
  email_hash?: string | null;
};

@Injectable()
export class NonInteractiveLoginAuditService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  emit(event: NonInteractiveLoginAuditInput): void {
    const record = {
      ...event,
      non_interactive_login: true,
      timestamp: new Date().toISOString(),
    };
    // Raw JSON line on stdout — the canonical audit stream consumed by the
    // log collector. Must stay byte-stable with the OIDC audit format.
    process.stdout.write(JSON.stringify(record) + '\n');
    // Dev-friendly mirror at verbose level. Production pipelines must rely
    // on the stdout JSON line above, not on Winston output; this only helps
    // when tailing a dev console.
    this.logger.verbose?.(
      `[non-interactive-login audit] ${event.event_type} outcome=${event.outcome}${event.error_code ? ` error=${event.error_code}` : ''}`,
      LogContext.AUTH
    );
  }
}
