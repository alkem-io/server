import { ORGANIZATION_COMMUNITY_INTENDED_OWNERS } from '@common/constants/authorization/audit.intended.owners';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { LogContext } from '@common/enums/logging.context';
import { ActorContext } from '@core/actor-context/actor.context';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { PlatformAuditCategory } from '@domain/community/user-email-change/enums/platform.audit.category';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { PlatformAuditOutcome } from '@domain/community/user-email-change/enums/platform.audit.outcome';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import {
  OrganizationAdministrationAction,
  OrganizationAdministrationAuditDetails,
  OrganizationAdministrationWithheldReason,
} from '@domain/community/user-email-change/platform.audit.entry.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { resolveInitiatorRole } from '@src/platform-admin/platform-audit-attribution/resolve.initiator.role';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Repository } from 'typeorm';

export interface RecordOrganizationAdministrationInput {
  /** The initiator: the acting Support user, or at accept time the offerer. */
  actorContext: ActorContext;
  /** The organization's role set; the organization is resolved from it. */
  roleSetId: string;
  action: OrganizationAdministrationAction;
  /** The target user. Omitted for an email invitation (no user yet). */
  targetUserId?: string;
  roles?: string[];
  withheldRoles?: string[];
  reason?: OrganizationAdministrationWithheldReason;
  invitationId?: string;
  platformInvitationId?: string;
  applicationId?: string;
}

const OUTCOME_BY_ACTION: Record<
  OrganizationAdministrationAction,
  PlatformAuditOutcome
> = {
  invite_user: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  invite_email: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  resend_email_invitation: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  revoke_user_invitation: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  revoke_email_invitation: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  approve_application: PlatformAuditOutcome.ROLE_GRANTED,
  reject_application: PlatformAuditOutcome.OPERATION_SUCCEEDED,
  assign_role: PlatformAuditOutcome.ROLE_GRANTED,
  remove_role: PlatformAuditOutcome.ROLE_REVOKED,
  remove_member: PlatformAuditOutcome.ROLE_REVOKED,
  extra_role_honoured: PlatformAuditOutcome.ROLE_GRANTED,
  extra_role_withheld: PlatformAuditOutcome.OPERATION_SUCCEEDED,
};

/**
 * Audit trail for the `organization_administration` category: organization
 * Community-tab actions taken through the Platform Support path. Callers
 * invoke it ONLY when the org-community gate returned `platform-support`, and
 * only AFTER the effect has completed — one call per target.
 *
 * Column semantics:
 * - `initiatorUserId` = the acting Support user (accept-time rows: whoever
 *   offered the extra role); `initiatorRole` = `platform_support`.
 * - `subjectUserId` = the target user, or NULL for an email invitation.
 * - `subjectOrganizationId` = the organization owning `roleSetId`.
 * - `details` = identifiers only, never an email address.
 *
 * FAIL-OPEN: the action has already happened, so a failed write (including
 * the organization lookup) is logged at error level and swallowed. There is no
 * compensation path.
 */
@Injectable()
export class OrganizationAdministrationAuditService {
  constructor(
    @InjectRepository(PlatformAuditEntry)
    private readonly auditRepository: Repository<PlatformAuditEntry>,
    private readonly organizationLookupService: OrganizationLookupService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async record(
    input: RecordOrganizationAdministrationInput
  ): Promise<void> {
    try {
      const organization =
        await this.organizationLookupService.getOrganizationForRoleSetOrFail(
          input.roleSetId
        );
      const details: OrganizationAdministrationAuditDetails = {
        action: input.action,
        roleSetId: input.roleSetId,
      };
      if (input.roles && input.roles.length > 0) details.roles = input.roles;
      if (input.action === 'extra_role_withheld' || input.withheldRoles?.length)
        details.withheldRoles = input.withheldRoles ?? [];
      if (input.action === 'extra_role_withheld' && input.reason)
        details.reason = input.reason;
      if (input.invitationId) details.invitationId = input.invitationId;
      if (input.platformInvitationId)
        details.platformInvitationId = input.platformInvitationId;
      if (input.applicationId) details.applicationId = input.applicationId;

      const entry = this.auditRepository.create({
        category: PlatformAuditCategory.ORGANIZATION_ADMINISTRATION,
        subjectUserId: input.targetUserId,
        subjectOrganizationId: organization.id,
        initiatorUserId: input.actorContext.actorID,
        initiatorRole: this.initiatorRole(input),
        outcome: OUTCOME_BY_ACTION[input.action],
        details,
      });
      await this.auditRepository.save(entry);
    } catch (error) {
      this.logger.error?.(
        {
          message: 'Failed to record organization-administration audit entry',
          action: input.action,
          roleSetId: input.roleSetId,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
    }
  }

  /**
   * Whether `offererID` issued an invitation to `inviteeID` on `roleSetId`
   * through the Support path — consulted at accept time when the offerer no
   * longer has any standing, so a withheld Support offer is still recorded.
   * An email invitation carries no user until registration, so any Support
   * email invitation by the same offerer on the same role set counts.
   * Fails open to `false` (no row is better than a blocked accept).
   */
  public async wasOfferedOnSupportPath(
    offererID: string,
    inviteeID: string,
    roleSetId: string
  ): Promise<boolean> {
    try {
      const count = await this.auditRepository
        .createQueryBuilder('entry')
        .where('entry.category = :category', {
          category: PlatformAuditCategory.ORGANIZATION_ADMINISTRATION,
        })
        .andWhere('entry.initiatorUserId = :offererID', { offererID })
        .andWhere("entry.details ->> 'roleSetId' = :roleSetId", { roleSetId })
        .andWhere(
          "(entry.details ->> 'action' = 'invite_email' OR (entry.details ->> 'action' = 'invite_user' AND entry.subjectUserId = :inviteeID))",
          { inviteeID }
        )
        .getCount();
      return count > 0;
    } catch (error) {
      this.logger.error?.(
        {
          message:
            'Failed to look up the Support origin of an organization invitation',
          roleSetId,
          error: error instanceof Error ? error.message : String(error),
        },
        error instanceof Error ? error.stack : undefined,
        LogContext.PLATFORM
      );
      return false;
    }
  }

  private initiatorRole(
    input: RecordOrganizationAdministrationInput
  ): PlatformAuditInitiatorRole {
    // A withheld offer whose offerer lost the Support credential still
    // records the Support offer: the offerer no longer holds the role the
    // attribution rule looks for, so it is stated rather than derived.
    if (input.reason === 'standing_lost') {
      return PlatformAuditInitiatorRole.PLATFORM_SUPPORT;
    }
    return resolveInitiatorRole({
      actorCredentialTypes: input.actorContext.credentials.map(
        credential => credential.type as AuthorizationCredential
      ),
      intendedOwners: ORGANIZATION_COMMUNITY_INTENDED_OWNERS,
    });
  }
}
