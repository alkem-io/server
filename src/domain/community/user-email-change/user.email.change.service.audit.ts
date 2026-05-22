import { MID_TEXT_LENGTH } from '@common/constants';
import { Injectable } from '@nestjs/common';
import { PlatformAuditInitiatorRole } from './enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from './enums/platform.audit.outcome';
import {
  EmailChangeAuditDetails,
  IPlatformAuditEntry,
} from './platform.audit.entry.interface';
import { PlatformAuditEntryRepository } from './platform.audit.entry.repository';

export interface RecordEmailChangeAuditInput {
  subjectUserId: string;
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  outcome: PlatformAuditOutcome;
  oldEmail?: string;
  newEmail?: string;
  failureReason?: string;
  correlationId?: string;
  /**
   * Reserved for future ISO 27001 categories. Not populated by this spec.
   */
  requestContext?: EmailChangeAuditDetails['requestContext'];
}

/**
 * The 13 outcome values the email-change category is permitted to write.
 * Service-layer enforcement of the per-category subset (data-model.md
 * §Validation rules); the cross-category Postgres enum would accept future
 * categories' outcomes, but this service rejects them. `COMMIT_STARTED` is the
 * internal crash-window breadcrumb (research.md §R15) — a valid email-change
 * outcome to write, but filtered out of the GraphQL-facing read methods.
 */
const ALLOWED_EMAIL_CHANGE_OUTCOMES: ReadonlySet<PlatformAuditOutcome> =
  new Set([
    PlatformAuditOutcome.COMMITTED,
    PlatformAuditOutcome.ROLLED_BACK,
    PlatformAuditOutcome.DRIFT_DETECTED,
    PlatformAuditOutcome.DRIFT_RESOLVED,
    PlatformAuditOutcome.DRIFT_RESOLUTION_FAILED,
    PlatformAuditOutcome.SECURITY_SIGNAL_FAILED,
    PlatformAuditOutcome.NEW_ADDRESS_NOTIFICATION_FAILED,
    PlatformAuditOutcome.GLOBAL_ADMIN_NOTIFICATION_FAILED,
    PlatformAuditOutcome.SPACE_ADMIN_NOTIFICATION_FAILED,
    PlatformAuditOutcome.SESSION_INVALIDATION_FAILED,
    PlatformAuditOutcome.REJECTED_VALIDATION,
    PlatformAuditOutcome.REJECTED_CONFLICT,
    PlatformAuditOutcome.COMMIT_STARTED,
  ]);

@Injectable()
export class UserEmailChangeAuditService {
  constructor(private readonly auditRepository: PlatformAuditEntryRepository) {}

  public async record(
    input: RecordEmailChangeAuditInput
  ): Promise<IPlatformAuditEntry> {
    if (!ALLOWED_EMAIL_CHANGE_OUTCOMES.has(input.outcome)) {
      throw new Error(
        `Outcome ${input.outcome} is not a valid email-change outcome.`
      );
    }

    const details = this.buildDetails(input);

    return this.auditRepository.appendEmailChangeEntry({
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

  private buildDetails(
    input: RecordEmailChangeAuditInput
  ): EmailChangeAuditDetails | undefined {
    const details: EmailChangeAuditDetails = {};
    if (input.oldEmail !== undefined) {
      details.oldEmail = enforceEmailLength(input.oldEmail);
    }
    if (input.newEmail !== undefined) {
      details.newEmail = enforceEmailLength(input.newEmail);
    }
    if (input.requestContext) {
      details.requestContext = input.requestContext;
    }
    return Object.keys(details).length > 0 ? details : undefined;
  }
}

function enforceEmailLength(value: string): string {
  if (value.length > MID_TEXT_LENGTH) {
    return value.slice(0, MID_TEXT_LENGTH);
  }
  return value;
}

function truncateFailureReason(reason: string): string {
  // The DB column is varchar(128). The service truncates defensively rather than
  // failing the audit write — failing to record an audit row would be a worse
  // outcome than recording a slightly truncated reason.
  return reason.length > 128 ? reason.slice(0, 128) : reason;
}
