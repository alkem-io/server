import { LogContext } from '@common/enums';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UUID } from '@domain/common/scalars';
import {
  UserEmailChangeAuditEntries,
  UserEmailChangeAuditEntry,
  UserProfileSummary,
} from '@domain/community/user-email-change/dto/user.email.change.audit.entry';
import { UserEmailChangeAuditOutcome } from '@domain/community/user-email-change/enums/user.email.change.audit.outcome';
import { UserEmailChangeInitiatorRole } from '@domain/community/user-email-change/enums/user.email.change.initiator.role';
import { PlatformAuditEntry } from '@domain/community/user-email-change/platform.audit.entry.entity';
import { UserEmailChangeService } from '@domain/community/user-email-change/user.email.change.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Args, Float, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAdminQueryResults } from '@src/platform-admin/admin/dto/platform.admin.query.results';

@Resolver(() => PlatformAdminQueryResults)
export class AdminUserEmailChangeResolverFields {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly userEmailChangeService: UserEmailChangeService,
    private readonly userLookupService: UserLookupService
  ) {}

  @ResolveField(() => UserEmailChangeAuditEntry, {
    nullable: true,
    description:
      'The most recent email-change audit entry for the named subject user. Returns null if no audit entry exists.',
  })
  async latestUserEmailChangeAuditEntry(
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string
  ): Promise<UserEmailChangeAuditEntry | null> {
    await this.assertPlatformAdmin(
      actorContext,
      `platformAdmin latestUserEmailChangeAuditEntry subject=${userID}`
    );
    const row =
      await this.userEmailChangeService.getLatestAuditEntryForSubject(userID);
    if (!row) return null;
    return this.projectRow(row);
  }

  @ResolveField(() => UserEmailChangeAuditEntries, {
    nullable: false,
    description:
      'Paginated email-change audit-entry history for the named subject user, ordered by timestamp descending. Cursor pagination per docs/Pagination.md.',
  })
  async userEmailChangeAuditEntries(
    @CurrentActor() actorContext: ActorContext,
    @Args('userID', { type: () => UUID }) userID: string,
    @Args('after', { type: () => String, nullable: true }) after?: string,
    @Args('first', { type: () => Float, nullable: true }) first?: number,
    @Args('before', { type: () => String, nullable: true }) before?: string,
    @Args('last', { type: () => Float, nullable: true }) last?: number
  ): Promise<UserEmailChangeAuditEntries> {
    await this.assertPlatformAdmin(
      actorContext,
      `platformAdmin userEmailChangeAuditEntries subject=${userID}`
    );
    const page = await this.userEmailChangeService.getAuditEntriesForSubject(
      userID,
      { after, first, before, last }
    );
    const projected = await Promise.all(
      page.entries.map(row => this.projectRow(row))
    );
    return {
      auditEntries: projected,
      pageInfo: {
        startCursor: page.startCursor,
        endCursor: page.endCursor,
        hasNextPage: page.hasNextPage,
        hasPreviousPage: page.hasPreviousPage,
      },
      total: page.total,
    };
  }

  private async assertPlatformAdmin(
    actorContext: ActorContext,
    description: string
  ): Promise<void> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      description
    );
  }

  /**
   * Projects a raw `platform_audit_entry` row (filtered to `category =
   * 'email_change'`) into the GraphQL `UserEmailChangeAuditEntry`. The
   * cross-category Postgres enums share lowercase string values with the
   * feature-scoped GraphQL enums for the email-change subset, so the
   * narrowing is mechanical at runtime — but we defensively skip values that
   * are not in the email-change subset (would indicate a category-mismatch
   * write bug from a future ISO 27001 service).
   */
  private async projectRow(
    row: PlatformAuditEntry
  ): Promise<UserEmailChangeAuditEntry> {
    const allowedOutcomes = new Set<string>(
      Object.values(UserEmailChangeAuditOutcome)
    );
    const allowedRoles = new Set<string>(
      Object.values(UserEmailChangeInitiatorRole)
    );
    if (!allowedOutcomes.has(row.outcome)) {
      throw new Error(
        `platform_audit_entry row ${row.id} carries non-email-change outcome ${row.outcome}`
      );
    }
    if (!allowedRoles.has(row.initiatorRole)) {
      throw new Error(
        `platform_audit_entry row ${row.id} carries non-email-change initiatorRole ${row.initiatorRole}`
      );
    }

    const subject = await this.resolveSummaryOrNull(row.subjectUserId);
    if (!subject) {
      // Per data-model.md §Retention, subject deletion may have removed the
      // user record. We still surface the audit row using a placeholder.
      throw new Error(
        `Subject user ${row.subjectUserId} cannot be resolved for audit row ${row.id}`
      );
    }
    const initiator = row.initiatorUserId
      ? ((await this.resolveSummaryOrNull(row.initiatorUserId)) ?? undefined)
      : undefined;

    return {
      id: row.id,
      subject,
      initiator,
      initiatorRole:
        row.initiatorRole as unknown as UserEmailChangeInitiatorRole,
      oldEmail: row.details?.oldEmail,
      newEmail: row.details?.newEmail,
      outcome: row.outcome as unknown as UserEmailChangeAuditOutcome,
      failureReason: row.failureReason,
      reason: row.details?.reason,
      approver: row.details?.approver,
      timestamp: row.createdDate,
    };
  }

  private async resolveSummaryOrNull(
    userId: string
  ): Promise<UserProfileSummary | null> {
    try {
      const user = await this.userLookupService.getUserByIdOrFail(userId, {
        relations: { profile: true },
      });
      return { id: user.id, displayName: user.profile.displayName };
    } catch {
      // Reading-side robustness — if the user record is gone, the audit row
      // still surfaces but without the resolved summary.
      void LogContext;
      return null;
    }
  }
}
