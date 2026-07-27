import { LogContext } from '@common/enums/logging.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformConfigurationAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export interface RecordConfigurationChangeInput {
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  setting: string;
  previousValue?: unknown;
  newValue?: unknown;
  licensePlanId?: string;
  outcome: 'success' | 'failure';
}

/**
 * Audit trail for the `platform_configuration` category (A10/A13,
 * 027-platform-role-redesign, T023, data-model.md §6): platform settings and
 * licensing-framework/plan definition changes. No subject — `subjectUserId`
 * and `subjectOrganizationId` both null (platform-wide by nature).
 *
 * Fail-open, matching every category except `platform_role_assignment`.
 */
@Injectable()
export class PlatformConfigurationAuditService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async recordChange(
    input: RecordConfigurationChangeInput
  ): Promise<void> {
    try {
      const details: PlatformConfigurationAuditDetails = {
        setting: input.setting,
        previousValue: input.previousValue,
        newValue: input.newValue,
        licensePlanId: input.licensePlanId,
      };
      const entry = this.auditRepository.create({
        category: PlatformAuditCategory.PLATFORM_CONFIGURATION,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        outcome:
          input.outcome === 'success'
            ? PlatformAuditOutcome.CONFIGURATION_CHANGED
            : PlatformAuditOutcome.OPERATION_FAILED,
        details,
      });
      await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to record platform-configuration audit entry',
          setting: input.setting,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
    }
  }
}
