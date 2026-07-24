import { LogContext } from '@common/enums/logging.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformOperationsAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export interface RecordOperationInput {
  /** The acting user — written as both initiator and subject. */
  actorID: string;
  /** GraphQL mutation name of the operational action. */
  action: string;
  outcome: 'success' | 'failure';
  details?: Omit<PlatformOperationsAuditDetails, 'action'>;
}

/**
 * Audit trail for the operational & maintenance mutation family
 * (workspace#032, FR-016). One `platform_audit_entry` row per execution,
 * regardless of which role authorized it.
 *
 * Column semantics for this category:
 * - `initiatorUserId` = `subjectUserId` = the actor: operations have no
 *   subject user, and the column is non-null.
 * - `initiatorRole` is the fixed coarse enum tier `platform_admin` ("human
 *   admin-tier actor" — the enum only has self/platform_admin/system/service).
 *   It is NOT a claim the actor holds GLOBAL_ADMIN; the precise actor is
 *   `initiatorUserId`.
 *
 * Fail-open by design: an audit-write failure is logged and swallowed —
 * recording must never break the operational mutation itself (FR-016
 * clarification 2026-07-23).
 */
@Injectable()
export class PlatformOperationsAuditService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async recordOperation(input: RecordOperationInput): Promise<void> {
    try {
      const entry = this.auditRepository.create({
        category: PlatformAuditCategory.PLATFORM_OPERATIONS,
        subjectUserId: input.actorID,
        initiatorUserId: input.actorID,
        initiatorRole: PlatformAuditInitiatorRole.PLATFORM_ADMIN,
        outcome:
          input.outcome === 'success'
            ? PlatformAuditOutcome.OPERATION_SUCCEEDED
            : PlatformAuditOutcome.OPERATION_FAILED,
        details: { ...input.details, action: input.action },
      });
      await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to record platform-operations audit entry',
          action: input.action,
          outcome: input.outcome,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
    }
  }
}
