import { LogContext } from '@common/enums/logging.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformUserRecordAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export interface RecordUserRecordActionInput {
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  /** The targeted user — MUST be the real target (never the actor as
   * placeholder), so a self-targeted action is derivable as self-affecting
   * (FR-030, SC-015). */
  targetUserId: string;
  action: string;
  kratosIdentityId?: string;
  outcome: 'identity_deleted' | 'account_reset' | 'success' | 'failure';
}

/**
 * Audit trail for the `platform_user_record` category (A4/A5,
 * 027-platform-role-redesign, T022, data-model.md §6): identity/account
 * deletion & reset. The email-change flow keeps writing its own
 * `email_change` category directly.
 *
 * Fail-open (like every category except `platform_role_assignment`): a
 * write failure is logged and the mutation proceeds.
 */
@Injectable()
export class PlatformUserRecordAuditService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async recordAction(input: RecordUserRecordActionInput): Promise<void> {
    try {
      const outcome =
        input.outcome === 'identity_deleted'
          ? PlatformAuditOutcome.IDENTITY_DELETED
          : input.outcome === 'account_reset'
            ? PlatformAuditOutcome.ACCOUNT_RESET
            : input.outcome === 'success'
              ? PlatformAuditOutcome.OPERATION_SUCCEEDED
              : PlatformAuditOutcome.OPERATION_FAILED;
      const details: PlatformUserRecordAuditDetails = {
        action: input.action,
        targetUserId: input.targetUserId,
        kratosIdentityId: input.kratosIdentityId,
      };
      const entry = this.auditRepository.create({
        category: PlatformAuditCategory.PLATFORM_USER_RECORD,
        subjectUserId: input.targetUserId,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        outcome,
        details,
      });
      await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to record platform-user-record audit entry',
          action: input.action,
          targetUserId: input.targetUserId,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
    }
  }
}
