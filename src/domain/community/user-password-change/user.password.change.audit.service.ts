import { Injectable } from '@nestjs/common';
import { PlatformAuditInitiatorRole } from '../user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '../user-email-change/enums/platform.audit.outcome';
import {
  IPlatformAuditEntry,
  PasswordChangeAuditDetails,
} from '../user-email-change/platform.audit.entry.interface';
import { PlatformAuditEntryRepository } from '../user-email-change/platform.audit.entry.repository';

export interface RecordPasswordChangeAuditInput {
  subjectUserId: string;
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  outcome: PlatformAuditOutcome;
  observedAt?: string;
  sourceFlowId?: string;
  failureReason?: string;
  correlationId?: string;
  requestContext?: PasswordChangeAuditDetails['requestContext'];
}

/**
 * The outcomes the password-change category is permitted to write. Service-
 * layer enforcement of the per-category subset (mirroring the email-change
 * audit-service guard); the Postgres enum is cross-category so the DB would
 * accept other values, but this service rejects them.
 */
const ALLOWED_PASSWORD_CHANGE_OUTCOMES: ReadonlySet<PlatformAuditOutcome> =
  new Set([
    PlatformAuditOutcome.OBSERVED,
    PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
  ]);

@Injectable()
export class UserPasswordChangeAuditService {
  constructor(private readonly auditRepository: PlatformAuditEntryRepository) {}

  public async record(
    input: RecordPasswordChangeAuditInput
  ): Promise<IPlatformAuditEntry> {
    if (!ALLOWED_PASSWORD_CHANGE_OUTCOMES.has(input.outcome)) {
      throw new Error(
        `Outcome ${input.outcome} is not a valid password-change outcome.`
      );
    }

    const details = this.buildDetails(input);

    return this.auditRepository.appendPasswordChangeEntry({
      subjectUserId: input.subjectUserId,
      initiatorUserId: input.initiatorUserId,
      initiatorRole: input.initiatorRole,
      outcome: input.outcome,
      failureReason: input.failureReason
        ? truncateFailureReason(input.failureReason)
        : undefined,
      correlationId: input.correlationId,
      details,
    });
  }

  /**
   * Idempotency check for spec 005's broker consumer (FR-005). Returns true
   * when an `OBSERVED` password-change audit row already exists for the
   * `(subjectUserId, sourceFlowId)` key. The consumer uses this to no-op on
   * redelivered `USER_PASSWORD_CHANGED` events before invoking the observer.
   */
  public async existsObservedFor(
    subjectUserId: string,
    sourceFlowId: string
  ): Promise<boolean> {
    return this.auditRepository.existsObservedFor(subjectUserId, sourceFlowId);
  }

  private buildDetails(
    input: RecordPasswordChangeAuditInput
  ): PasswordChangeAuditDetails | undefined {
    const details: PasswordChangeAuditDetails = {};
    if (input.observedAt !== undefined) {
      details.observedAt = input.observedAt;
    }
    if (input.sourceFlowId !== undefined) {
      details.sourceFlowId = input.sourceFlowId;
    }
    if (input.requestContext) {
      details.requestContext = input.requestContext;
    }
    return Object.keys(details).length > 0 ? details : undefined;
  }
}

function truncateFailureReason(reason: string): string {
  // The DB column is varchar(128). Truncate defensively rather than failing
  // the audit write — failing to record a row is worse than truncating.
  return reason.length > 128 ? reason.slice(0, 128) : reason;
}
