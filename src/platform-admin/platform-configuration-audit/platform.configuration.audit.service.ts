import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { LogContext } from '@common/enums/logging.context';
import { ActorContext } from '@core/actor-context/actor.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformConfigurationAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { resolveInitiatorRole } from '@src/platform-admin/platform-audit-attribution/resolve.initiator.role';
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

  /** T058 convenience wrapper — see `PlatformResourceAuditService.recordEventForActor`
   * for the FR-025 attribution / fail-open rationale (identical here). A10/A13
   * are single-path surfaces (no owner branch), so every successful call is,
   * by construction, a platform-privileged one — no FR-018a discriminator
   * needed at these call sites. */
  public async recordChangeForActor(
    actorContext: ActorContext,
    intendedOwners: readonly AuthorizationCredential[],
    legacyReachers: readonly AuthorizationCredential[],
    input: Omit<
      RecordConfigurationChangeInput,
      'initiatorUserId' | 'initiatorRole'
    >
  ): Promise<void> {
    let initiatorRole: PlatformAuditInitiatorRole;
    try {
      initiatorRole = resolveInitiatorRole({
        actorCredentialTypes: actorContext.credentials?.map(
          c => c.type as AuthorizationCredential
        ),
        intendedOwners,
        legacyReachers,
      });
    } catch (error) {
      this.logger.error?.(
        {
          message:
            'Failed to resolve FR-025 attribution for a platform-configuration audit entry — write skipped (fail-open)',
          setting: input.setting,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
      return;
    }
    await this.recordChange({
      ...input,
      initiatorUserId: actorContext.actorID,
      initiatorRole,
    });
  }

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
