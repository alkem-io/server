import { LogContext } from '@common/enums/logging.context';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformResourceAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export interface RecordResourceEventInput {
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  /** Owning organization, when the resource is org-owned (A8's container
   * deletes). Null for space/space-content resources. */
  subjectOrganizationId?: string;
  resourceKind: string;
  resourceId: string;
  fromAccountId?: string;
  toAccountId?: string;
  visibility?: string;
  licensePlan?: string;
  outcome:
    | 'moved'
    | 'deleted'
    | 'visibility_changed'
    | 'license_assigned'
    | 'license_revoked'
    | 'failure';
}

/**
 * Audit trail for the `platform_resource` category (A8/A9/A12/A14,
 * 027-platform-role-redesign, T024, data-model.md §6): resource moves,
 * container deletions, visibility changes, license-usage assignment.
 *
 * **Write boundary (FR-018a, T058)**: on a DUAL-PATH surface (A8), the
 * caller MUST invoke this only when the authorization result shows the
 * PLATFORM privilege authorized the call — never on the ordinary-owner
 * branch. This service does not and cannot enforce that itself; it trusts
 * its caller, as does every audit writer in this feature (the branch
 * decision lives at the gate, not the writer).
 *
 * Fail-open, matching every category except `platform_role_assignment`.
 */
@Injectable()
export class PlatformResourceAuditService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async recordEvent(input: RecordResourceEventInput): Promise<void> {
    try {
      const details: PlatformResourceAuditDetails = {
        resourceKind: input.resourceKind,
        resourceId: input.resourceId,
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        visibility: input.visibility,
        licensePlan: input.licensePlan,
      };
      const outcome = this.mapOutcome(input.outcome);
      const entry = this.auditRepository.create({
        category: PlatformAuditCategory.PLATFORM_RESOURCE,
        subjectOrganizationId: input.subjectOrganizationId,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        outcome,
        details,
      });
      await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to record platform-resource audit entry',
          resourceKind: input.resourceKind,
          resourceId: input.resourceId,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
    }
  }

  private mapOutcome(
    outcome: RecordResourceEventInput['outcome']
  ): PlatformAuditOutcome {
    switch (outcome) {
      case 'moved':
        return PlatformAuditOutcome.RESOURCE_MOVED;
      case 'deleted':
        return PlatformAuditOutcome.RESOURCE_DELETED;
      case 'visibility_changed':
        return PlatformAuditOutcome.VISIBILITY_CHANGED;
      case 'license_assigned':
        return PlatformAuditOutcome.LICENSE_ASSIGNED;
      case 'license_revoked':
        return PlatformAuditOutcome.LICENSE_REVOKED;
      case 'failure':
        return PlatformAuditOutcome.OPERATION_FAILED;
    }
  }
}
