import { LogContext } from '@common/enums/logging.context';
import { PlatformRoleAssignmentAuditException } from '@common/exceptions/platform.role.assignment.audit.exception';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { PlatformRoleAssignmentAuditDetails } from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export interface RecordRoleGrantOrRevokeInput {
  /** The acting operator; undefined for a bootstrap-seeded grant (FR-013b). */
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  /** Target user (`targetKind: 'user'`) or organization (`'organization'`). */
  targetKind: 'user' | 'organization';
  targetId: string;
  role: string;
  outcome: 'granted' | 'revoked';
  /** True for a bootstrap-seeded write — writes fail OPEN. Operator-initiated
   * writes (the default) fail CLOSED (FR-027). */
  seeded?: boolean;
}

export interface RecordRoleGrantRejectedInput {
  initiatorUserId?: string;
  initiatorRole: PlatformAuditInitiatorRole;
  targetKind: 'user' | 'organization';
  targetId: string;
  role: string;
  rejectedRule: string;
  seeded?: boolean;
}

export interface RecordServiceProfileChangeInput {
  initiatorUserId: string;
  initiatorRole: PlatformAuditInitiatorRole;
  targetUserId: string;
  previousServiceProfile: boolean;
  newServiceProfile: boolean;
}

export interface RecordServiceProfileRejectedInput {
  initiatorUserId: string;
  initiatorRole: PlatformAuditInitiatorRole;
  targetUserId: string;
  rejectedRule: string;
  newServiceProfile: boolean;
}

/**
 * Audit trail for the `platform_role_assignment` category
 * (027-platform-role-redesign, T021, data-model.md §6). One row per grant,
 * revoke, rejection, or A21 service-profile change/rejection.
 *
 * **Fail-closed vs fail-open, chosen per call (FR-027), not per category**:
 * operator-initiated writes (`seeded` falsy) THROW on failure — the caller
 * MUST abort the grant/revoke, because the record IS the control. A
 * bootstrap-seeded write (`seeded: true`) fails OPEN — logged at error, the
 * grant still lands, because the break-glass must not depend on a healthy
 * audit store (FR-013b).
 *
 * Subject columns: `targetKind === 'user'` writes `subjectUserId`;
 * `'organization'` writes `subjectOrganizationId`. Never both (T026).
 */
@Injectable()
export class PlatformRoleAssignmentAuditService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async recordGrantOrRevoke(
    input: RecordRoleGrantOrRevokeInput
  ): Promise<void> {
    const details: PlatformRoleAssignmentAuditDetails = {
      role: input.role,
      targetKind: input.targetKind,
      seeded: input.seeded ?? false,
    };
    await this.write(
      {
        outcome:
          input.outcome === 'granted'
            ? PlatformAuditOutcome.ROLE_GRANTED
            : PlatformAuditOutcome.ROLE_REVOKED,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        targetKind: input.targetKind,
        targetId: input.targetId,
        details,
      },
      input.seeded ?? false,
      `role ${input.outcome} for ${input.targetKind} ${input.targetId}`
    );
  }

  public async recordGrantRejected(
    input: RecordRoleGrantRejectedInput
  ): Promise<void> {
    const details: PlatformRoleAssignmentAuditDetails = {
      role: input.role,
      targetKind: input.targetKind,
      rejectedRule: input.rejectedRule,
      seeded: input.seeded ?? false,
    };
    await this.write(
      {
        outcome: PlatformAuditOutcome.ROLE_GRANT_REJECTED,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        targetKind: input.targetKind,
        targetId: input.targetId,
        details,
      },
      input.seeded ?? false,
      `role grant rejected for ${input.targetKind} ${input.targetId}`
    );
  }

  /** A21 (T052): the service-profile marker is a precondition of a Platform
   * Spaces Reader grant, not a grant itself — no `role` on this row. */
  public async recordServiceProfileChange(
    input: RecordServiceProfileChangeInput
  ): Promise<void> {
    const details: PlatformRoleAssignmentAuditDetails = {
      previousServiceProfile: input.previousServiceProfile,
      newServiceProfile: input.newServiceProfile,
    };
    await this.write(
      {
        outcome: PlatformAuditOutcome.SERVICE_PROFILE_CHANGED,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        targetKind: 'user',
        targetId: input.targetUserId,
        details,
      },
      false,
      `service-profile marker changed for user ${input.targetUserId}`
    );
  }

  /** A21 rejected attempt (eighth clarification pass): reuses
   * `role_grant_rejected` — same class of event as a rejected role
   * assignment, no new outcome value. This is a WRITE attempt, unlike the
   * A20/A20b holder-list READ denial, which deliberately records nothing. */
  public async recordServiceProfileRejected(
    input: RecordServiceProfileRejectedInput
  ): Promise<void> {
    const details: PlatformRoleAssignmentAuditDetails = {
      rejectedRule: input.rejectedRule,
      newServiceProfile: input.newServiceProfile,
    };
    await this.write(
      {
        outcome: PlatformAuditOutcome.ROLE_GRANT_REJECTED,
        initiatorUserId: input.initiatorUserId,
        initiatorRole: input.initiatorRole,
        targetKind: 'user',
        targetId: input.targetUserId,
        details,
      },
      false,
      `service-profile change rejected for user ${input.targetUserId}`
    );
  }

  private async write(
    row: {
      outcome: PlatformAuditOutcome;
      initiatorUserId?: string;
      initiatorRole: PlatformAuditInitiatorRole;
      targetKind: 'user' | 'organization';
      targetId: string;
      details: PlatformRoleAssignmentAuditDetails;
    },
    seeded: boolean,
    description: string
  ): Promise<void> {
    try {
      const entry = this.auditRepository.create({
        category: PlatformAuditCategory.PLATFORM_ROLE_ASSIGNMENT,
        subjectUserId: row.targetKind === 'user' ? row.targetId : undefined,
        subjectOrganizationId:
          row.targetKind === 'organization' ? row.targetId : undefined,
        initiatorUserId: row.initiatorUserId,
        initiatorRole: row.initiatorRole,
        outcome: row.outcome,
        details: row.details,
      });
      await this.auditRepository.save(entry);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (seeded) {
        // FR-027: bootstrap-seeded writes fail OPEN — the break-glass must
        // never depend on a healthy audit store.
        this.logger.error?.(
          {
            message: `Failed to record SEEDED ${description} — grant still applied (fail-open)`,
            error: message,
          },
          error instanceof Error ? error.stack : undefined,
          LogContext.PLATFORM
        );
        return;
      }
      // FR-027: operator-initiated writes fail CLOSED — the caller MUST
      // abort the grant/revoke; the record IS the control.
      this.logger.error?.(
        {
          message: `Failed to record OPERATOR-INITIATED ${description} — aborting (fail-closed)`,
          error: message,
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
      throw new PlatformRoleAssignmentAuditException(
        `Unable to record role-assignment audit entry; the operation was NOT applied: ${description}`
      );
    }
  }
}
