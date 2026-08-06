import { RoleChangeType } from '@alkemio/notifications-lib';
import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { RoleName } from '@common/enums/role.name';
import { ForbiddenException } from '@common/exceptions/forbidden.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformService } from '@platform/platform/platform.service';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import {
  resolveInitiatorRole,
  resolveInitiatorRoleBestEffort,
} from '@src/platform-admin/platform-audit-attribution/resolve.initiator.role';
import { PlatformRoleAssignmentAuditService } from '@src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AssignPlatformRoleInput } from './dto/platform.role.dto.assign';
import { RemovePlatformRoleInput } from './dto/platform.role.dto.remove';
import {
  FEATURE_FAMILY_ROLES,
  PLATFORM_FAMILY_ROLES,
  PlatformRoleAssignmentRulesService,
} from './platform.role.assignment.rules.service';

/**
 * A1/A2's declared attribution facts (T040b's eventual census entries,
 * inlined here until that file exists — FR-025).
 *  - A1 (`platform-*` role assign/revoke, `PLATFORM_ROLES_ASSIGN`): owned by
 *    Platform Roles Admin alone, reachable in Slice A ONLY by the legacy
 *    `global-admin` credential — PLATFORM_ROLES_ASSIGN' pre-existing sole
 *    holder, NOT global-support/global-license-manager, which never held it.
 *  - A2 (`feature-*` role assign/revoke, `FEATURE_ROLE_ASSIGN`): owned by
 *    BOTH Platform Users Admin and Platform Roles Admin; no legacy reacher
 *    (`FEATURE_ROLE_ASSIGN` is a wholly new privilege, T007).
 */
const A1_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_ROLES_ADMIN,
];
const A1_LEGACY_REACHERS: readonly AuthorizationCredential[] = [];
const A2_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_USERS_ADMIN,
  AuthorizationCredential.PLATFORM_ROLES_ADMIN,
];
const A2_LEGACY_REACHERS: readonly AuthorizationCredential[] = [];

/** Roles the new 027-platform-role-redesign assignment rule engine governs
 * (T030-T032a). Every other RoleName (legacy `global-*` / the pre-existing
 * `platform-beta-tester` / `platform-vc-campaign` / `platform-assistant-access`)
 * keeps its EXACT pre-existing gating below, unmodified — Slice A is
 * additive-only and must not narrow who can assign a legacy role. */
const RULE_ENGINE_GOVERNED_ROLES: ReadonlySet<RoleName> = new Set([
  ...PLATFORM_FAMILY_ROLES,
  ...FEATURE_FAMILY_ROLES,
]);

@InstrumentResolver()
@Resolver()
export class PlatformRoleResolverMutations {
  /** 027-platform-role-redesign (T077, Slice B): the resolver-local
   * `[GLOBAL_ADMIN]` pin that used to live here is GONE, together with the
   * legacy roles it protected.
   *
   * It existed for one reason (sec-server-2/corr-server-1): T034 widened
   * `roleSet.authorization`'s `PLATFORM_ROLES_ASSIGN` rule to admit
   * `platform-roles-admin`, and the legacy `global-*` roles had to stay
   * assignable by `global-admin` ALONE for the length of the additive slice.
   * With the legacy roles removed from `RoleName` there is nothing left for
   * the pin to protect: every role this resolver can now be asked about is
   * either rule-engine-governed (the 13 target roles, six-rule engine +
   * fail-closed audit) or `platform-operations-admin`, which spec 032 made an
   * ordinary Roles-Admin-assignable role. Re-introducing a hardcoded
   * credential policy here would re-introduce a legacy grant path. */
  constructor(
    private accountService: AccountService,
    private accountLookupService: AccountLookupService,
    private accountLicenseService: AccountLicenseService,
    private authorizationService: AuthorizationService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private licenseService: LicenseService,
    private actorService: ActorService,
    private roleSetService: RoleSetService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private actorLookupService: ActorLookupService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private platformService: PlatformService,
    private assignmentRulesService: PlatformRoleAssignmentRulesService,
    private roleAssignmentAuditService: PlatformRoleAssignmentAuditService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * 027-platform-role-redesign (T077, Slice B) — the `else` branch of both
   * user-target mutations is now UNREACHABLE for every platform role, and this
   * is what stands in its place.
   *
   * `RULE_ENGINE_GOVERNED_ROLES` is `PLATFORM_FAMILY_ROLES ∪
   * FEATURE_FAMILY_ROLES` = all 13 target roles, and `platform-operations-admin`
   * is one of the ten `Platform …` members. Once T077 removed the legacy
   * vocabulary, nothing assignable to the platform role-set fell outside the
   * rule engine — so the branch's old job (an ordinary `PLATFORM_ROLES_ASSIGN`
   * check, or the legacy `[GLOBAL_ADMIN]` pin before it) applies to no role.
   *
   * Reaching here therefore means the caller passed a role name belonging to a
   * DIFFERENT role-set type (`member`, `admin`, `lead`, `associate`, `owner`) or
   * a baseline identity tier. Rejecting explicitly is what keeps that from
   * degrading into an unaudited assignment attempt: the old branch would have
   * run an authorization check and then failed deep inside
   * `assignActorToRole`, past the point where the six assignment rules and the
   * fail-closed audit write live.
   */
  private rejectNonPlatformRoleOrFail(
    role: RoleName,
    operation: 'assign' | 'remove'
  ): never {
    throw new ForbiddenException(
      `Rejected: ${role} is not a platform role and may not be ${operation}ed through the platform role surface`,
      LogContext.PLATFORM,
      { ruleId: 'holder-kind' }
    );
  }

  @Mutation(() => IUser, {
    description: 'Assigns a User to a role on the Platform.',
  })
  async assignPlatformRoleToUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('roleData') roleData: AssignPlatformRoleInput
  ): Promise<IUser> {
    const roleSet = await this.platformService.getRoleSetOrFail();
    const isRuleEngineGoverned = RULE_ENGINE_GOVERNED_ROLES.has(roleData.role);

    if (isRuleEngineGoverned) {
      // 027-platform-role-redesign (T030-T032): the target role model routes
      // through the shared five-rule engine + fail-closed audit write.
      // Every OTHER role (legacy `global-*`, `platform-beta-tester`,
      // `platform-vc-campaign`, `platform-assistant-access`) keeps its
      // EXACT pre-existing gating below — Slice A is additive-only.
      const targetUser = await this.userLookupService.getUserByIdOrFail(
        roleData.actorID
      );
      await this.evaluateGrantOrFail(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID,
        targetUser.serviceProfile
      );
    } else {
      this.rejectNonPlatformRoleOrFail(roleData.role, 'assign');
    }

    // corr-server-14 fix: captured BEFORE assignActorToRole so a failed
    // success-audit write's compensation logic (recordGrantSuccess) knows
    // whether the grant actually changed state or was an idempotent no-op
    // (target already held the role) — compensating a no-op would strip a
    // pre-existing grant the target legitimately held before this call.
    const heldRoleBeforeGrant = isRuleEngineGoverned
      ? await this.roleSetService.isInRole(
          roleData.actorID,
          roleSet,
          roleData.role
        )
      : false;

    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorID,
      actorContext,
      true
    );

    if (isRuleEngineGoverned) {
      // 027-platform-role-redesign (corr-server-5 fix): the SUCCESS audit
      // row is written only AFTER assignActorToRole has actually completed —
      // writing it beforehand (the pre-fix ordering) left a permanent audit
      // record of a grant that never happened whenever assignActorToRole
      // subsequently threw (e.g. a role-set policy limit).
      await this.recordGrantSuccess(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID,
        heldRoleBeforeGrant
      );
    }

    const user = await this.userLookupService.getUserByIdOrFail(
      roleData.actorID
    );
    if (
      // 027-platform-role-redesign (T040a, closed by T077): Feature Beta Tester
      // carries the SAME beta/trial license entitlement as the two legacy roles
      // it replaces (spec §Target global role model row 11), and is now the
      // ONLY role that does — `platform-beta-tester` and `platform-vc-campaign`
      // are gone. This is the one target role whose capability lives in a
      // manual entitlement grant rather than an authorization policy, which is
      // why FR-009/SC-007 name it explicitly.
      roleData.role === RoleName.FEATURE_BETA_TESTER
    ) {
      // Also assign the user account a license plan
      // Account IS the Actor - use accountID directly as actorID
      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.actorService.grantCredentialOrFail(
        user.accountID,
        accountLicenseCredential
      );
      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      actorContext.actorID,
      user,
      RoleChangeType.ADDED,
      roleData.role
    );

    return await this.userLookupService.getUserByIdOrFail(roleData.actorID);
  }

  @Mutation(() => IUser, {
    description: 'Removes a User from a Role on the Platform.',
  })
  async removePlatformRoleFromUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('roleData') roleData: RemovePlatformRoleInput
  ): Promise<IUser> {
    const roleSet = await this.platformService.getRoleSetOrFail();
    const isRuleEngineGoverned = RULE_ENGINE_GOVERNED_ROLES.has(roleData.role);

    if (isRuleEngineGoverned) {
      // 027-platform-role-redesign (sec-server-20 fix, 2026-07-31): resolve
      // the target as a USER before anything else, exactly as the grant
      // surface already does (`assignPlatformRoleToUser` calls
      // `getUserByIdOrFail` ahead of `evaluateGrantOrFail`). This surface
      // asserted `targetActorType: 'user'` to the rule engine without ever
      // checking it, and the first thing that actually verified the claim
      // was the `getUserByIdOrFail` at the END of the method — by which
      // point `removeActorFromRole` had already revoked the credential and
      // `recordRevokeSuccess` had filed the row under `subjectUserId`.
      //
      // An organization id therefore produced: a real credential revocation,
      // an audit row attributed to the wrong subject KIND, and an
      // EntityNotFound thrown back to the caller — i.e. the caller is told
      // the operation did not happen while the state change stands, and the
      // trail disagrees with both. Verifying up front makes the mutation
      // atomic again and costs one lookup the method already performs.
      await this.userLookupService.getUserByIdOrFail(roleData.actorID);
      await this.evaluateRevokeOrFail(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID
      );
    } else {
      this.rejectNonPlatformRoleOrFail(roleData.role, 'remove');
    }

    // corr-server-14 fix: captured BEFORE removeActorFromRole — see the
    // grant side's identical comment. `wasNoOp` for a revoke means the
    // target did NOT hold the role beforehand.
    const heldRoleBeforeRevoke = isRuleEngineGoverned
      ? await this.roleSetService.isInRole(
          roleData.actorID,
          roleSet,
          roleData.role
        )
      : false;

    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorID
    );

    if (isRuleEngineGoverned) {
      // 027-platform-role-redesign (corr-server-5 fix): success audit only
      // after removeActorFromRole actually completes — see the assign side.
      await this.recordRevokeSuccess(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID,
        !heldRoleBeforeRevoke
      );
    }

    const user = await this.userLookupService.getUserByIdOrFail(
      roleData.actorID
    );
    if (
      // T040a, closed by T077 — see the grant side's comment.
      roleData.role === RoleName.FEATURE_BETA_TESTER
    ) {
      // Also remove the user account a license plan
      // Account IS the Actor - use accountID directly as actorID
      const accountLicenseCredential: ICredentialDefinition = {
        type: LicensingCredentialBasedCredentialType.ACCOUNT_LICENSE_PLUS,
        resourceID: user.accountID,
      };
      await this.actorService.revokeCredential(
        user.accountID,
        accountLicenseCredential
      );

      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      actorContext.actorID,
      user,
      RoleChangeType.REMOVED,
      roleData.role
    );

    return await this.userLookupService.getUserByIdOrFail(roleData.actorID);
  }

  // --- 027-platform-role-redesign (T032a): organization-target assignment
  // surface. `Feature …` roles are grantable to an organization (FR-002);
  // `Platform …` roles never are (rule 2, enforced by the shared engine).
  // Body mirrors the user pair exactly: getRoleSetOrFail → evaluateOrFail →
  // fail-closed audit → assignActorToRole/removeActorFromRole. No
  // service-layer work needed — `assignActorToRole` already resolves
  // ActorType itself and its parent-role-set check returns `isMember: true`
  // for the platform role-set (parentless).

  @Mutation(() => IOrganization, {
    description: 'Assigns an Organization to a role on the Platform.',
  })
  async assignPlatformRoleToOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('roleData') roleData: AssignPlatformRoleInput
  ): Promise<IOrganization> {
    // corr-server-19 fix (2026-07-31): `getRoleSetOrFail()` is hoisted ABOVE
    // the surface guard so the guard has a policy to probe against — see the
    // note on `assertOrganizationSurfaceOrFail`.
    const roleSet = await this.platformService.getRoleSetOrFail();
    await this.assertOrganizationSurfaceOrFail(
      actorContext,
      roleSet,
      roleData.role,
      roleData.actorID
    );

    await this.evaluateGrantOrFail(
      actorContext,
      roleSet,
      roleData.role,
      'organization',
      roleData.actorID
    );

    // corr-server-14 fix: see the user-target grant surface's identical
    // comment.
    const heldRoleBeforeGrant = await this.roleSetService.isInRole(
      roleData.actorID,
      roleSet,
      roleData.role
    );

    await this.roleSetService.assignActorToRole(
      roleSet,
      roleData.role,
      roleData.actorID,
      actorContext,
      true
    );

    // 027-platform-role-redesign (corr-server-5 fix): success audit only
    // after assignActorToRole actually completes.
    await this.recordGrantSuccess(
      actorContext,
      roleSet,
      roleData.role,
      'organization',
      roleData.actorID,
      heldRoleBeforeGrant
    );

    return await this.organizationLookupService.getOrganizationByIdOrFail(
      roleData.actorID
    );
  }

  @Mutation(() => IOrganization, {
    description: 'Removes an Organization from a Role on the Platform.',
  })
  async removePlatformRoleFromOrganization(
    @CurrentActor() actorContext: ActorContext,
    @Args('roleData') roleData: RemovePlatformRoleInput
  ): Promise<IOrganization> {
    // corr-server-19 fix (2026-07-31): see the grant surface above.
    const roleSet = await this.platformService.getRoleSetOrFail();
    await this.assertOrganizationSurfaceOrFail(
      actorContext,
      roleSet,
      roleData.role,
      roleData.actorID
    );

    await this.evaluateRevokeOrFail(
      actorContext,
      roleSet,
      roleData.role,
      'organization',
      roleData.actorID
    );

    // corr-server-14 fix: see the user-target revoke surface's identical
    // comment.
    const heldRoleBeforeRevoke = await this.roleSetService.isInRole(
      roleData.actorID,
      roleSet,
      roleData.role
    );

    await this.roleSetService.removeActorFromRole(
      roleSet,
      roleData.role,
      roleData.actorID
    );

    // 027-platform-role-redesign (corr-server-5 fix): success audit only
    // after removeActorFromRole actually completes.
    await this.recordRevokeSuccess(
      actorContext,
      roleSet,
      roleData.role,
      'organization',
      roleData.actorID,
      !heldRoleBeforeRevoke
    );

    return await this.organizationLookupService.getOrganizationByIdOrFail(
      roleData.actorID
    );
  }

  /** 027-platform-role-redesign (sec-server-6 fix): the organization-target
   * surface (`assignPlatformRoleToOrganization` /
   * `removePlatformRoleFromOrganization`, T032a) has a use case ONLY for
   * `Feature …` roles (FR-002) — `Platform …` roles are already rejected by
   * rule 2 (`checkHolderKind`), but LEGACY `global-*` roles are members of
   * NEITHER `PLATFORM_FAMILY_ROLES` nor `FEATURE_FAMILY_ROLES`, so rule 2
   * never sees them and rule 1 (`checkAssignerCapability`) falls through to
   * the shared, Slice-A-widened `PLATFORM_ROLES_ASSIGN` check on
   * `roleSet.authorization` — the same widened policy the legacy-role
   * branch of the USER mutations deliberately avoids via
   * `legacyGlobalAdminPolicy`. Without this guard a `platform-roles-admin`
   * holder could mint `global-admin` (or any other legacy role) on an
   * account they control by routing it through the organization surface.
   * Reject anything outside `FEATURE_FAMILY_ROLES` here, before any rule
   * evaluation, credential write or audit call.
   *
   * Also verifies the target actually resolves to an ORGANIZATION —
   * `targetActorType: 'organization'` is otherwise asserted at the call
   * site rather than verified (sec-server-8): a mismatch here would let a
   * user-id grant/revoke land through the organization surface and file its
   * audit row against `subjectOrganizationId` with a user's id.
   *
   * corr-server-15 fix: BOTH rejection branches now write a
   * `role_grant_rejected` audit row (`ruleId: 'holder-kind'`) before
   * throwing — this guard runs ahead of `evaluateGrantOrFail`/
   * `evaluateRevokeOrFail`, the ONLY other places a `holder-kind` rejection
   * gets audited (via the shared rule engine's rule 2), so the SAME logical
   * rejection was landing in the trail when the engine caught it but NOT
   * when this guard did — the most security-relevant rejection this
   * feature has (the org-surface legacy-role-escalation block, sec-server-6)
   * was the one leaving no trace. */
  private async assertOrganizationSurfaceOrFail(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorId: string
  ): Promise<void> {
    // corr-server-19 fix (2026-07-31): the SAME narrowed, no-DB-write probe
    // `evaluateGrantOrFail`/`evaluateRevokeOrFail` carry (sec-server-11,
    // narrowed by corr-server-17/spec-server-18) — but this guard runs
    // BEFORE either of them, and it WRITES an audit row before throwing.
    //
    // Without the probe, any authenticated user could call
    // `assignPlatformRoleToOrganization` with a `Platform …` role and an
    // `actorID` of their choosing: the role is not in FEATURE_FAMILY_ROLES,
    // this guard fires, and one `platform_audit_entry` INSERT lands with an
    // attacker-chosen subject id — before ANYTHING checked whether the
    // caller may assign roles at all. Looped, that writes rows as fast as
    // requests arrive, with content the attacker picks. It re-opened on the
    // organization surface exactly what sec-server-11 closed on the user
    // surface; this surface never got the probe because its guard sat
    // UPSTREAM of `getRoleSetOrFail()` and so had no policy to probe
    // against. The two call sites now resolve the role set first.
    //
    // The narrowing is the point: this fires ONLY for an actor holding
    // NEITHER assigner privilege — a genuine unprivileged probe. A
    // PRIVILEGED actor reaching outside its family (e.g. a Platform Users
    // Admin naming a `platform-*` role) is not a probe and MUST fall
    // through to be audited; that attempt is what the trail exists for.
    if (
      !this.assignmentRulesService.hasAnyAssignerCapability(
        actorContext,
        roleSet.authorization
      )
    ) {
      throw new ForbiddenException(
        `Forbidden: ${this.assignmentRulesService.assignerPrivilegeFor(role)} required to assign role ${role}`,
        LogContext.PLATFORM,
        { ruleId: 'assigner-capability' }
      );
    }

    if (!FEATURE_FAMILY_ROLES.has(role)) {
      const message = `Rejected: role ${role} may not be assigned or removed through the organization surface`;
      await this.recordOrganizationSurfaceRejection(
        actorContext,
        role,
        targetActorId,
        message
      );
      throw new ForbiddenException(message, LogContext.PLATFORM, {
        ruleId: 'holder-kind',
      });
    }
    const actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(targetActorId);
    if (actorType !== ActorType.ORGANIZATION) {
      const message = `Rejected: target actor for role ${role} is not an organization`;
      await this.recordOrganizationSurfaceRejection(
        actorContext,
        role,
        targetActorId,
        message
      );
      throw new ForbiddenException(message, LogContext.PLATFORM, {
        ruleId: 'holder-kind',
      });
    }
  }

  /** corr-server-15 fix: shared by both `assertOrganizationSurfaceOrFail`
   * rejection branches — same shape as `evaluateGrantOrFail`'s catch block,
   * so both rejections of the same `holder-kind` rule land in the trail
   * identically regardless of which code path caught it. Fail-closed: a
   * write failure here aborts the mutation (via the caller's re-throw),
   * matching FR-027's rejected-attempt guarantee. */
  private async recordOrganizationSurfaceRejection(
    actorContext: ActorContext,
    role: RoleName,
    targetActorId: string,
    rejectedRule: string
  ): Promise<void> {
    await this.roleAssignmentAuditService.recordGrantRejected({
      initiatorUserId: actorContext.actorID,
      initiatorRole: this.resolveA1A2InitiatorRoleBestEffort(
        role,
        actorContext
      ),
      targetKind: 'organization',
      targetId: targetActorId,
      role,
      rejectedRule,
    });
  }

  /** Shared by both grant surfaces (user + organization): evaluate the five
   * assignment rules and write the FAIL-CLOSED REJECTION audit row (FR-027)
   * if evaluation fails — a rejection-audit-write failure aborts the grant
   * rather than silently outliving its own record. The SUCCESS row is
   * written separately by `recordGrantSuccess`, ONLY after the caller's
   * `assignActorToRole` has actually completed (corr-server-5 fix): writing
   * it here, before the data-layer mutation runs, left a permanent audit
   * record of a grant that never happened whenever `assignActorToRole`
   * subsequently threw (e.g. a role-set policy limit). */
  private async evaluateGrantOrFail(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorType: 'user' | 'organization',
    targetID: string,
    targetServiceProfile?: boolean
  ): Promise<void> {
    // 027-platform-role-redesign (sec-server-11 fix, narrowed by
    // corr-server-17/spec-server-18): a cheap, no-DB-write probe BEFORE
    // getHeldPlatformRoles' ~10 `isInRole` round trips and before any
    // rejection-audit write — but ONLY for an actor holding NEITHER
    // PLATFORM_ROLES_ASSIGN nor FEATURE_ROLE_ASSIGN at all (a genuine
    // unprivileged probe; any logged-in user could otherwise drive
    // unbounded reads plus one `platform_audit_entry` INSERT per request).
    // A privileged actor requesting a role outside its family (e.g. a
    // Platform Users Admin targeting a `platform-*` role) is NOT a probe —
    // it MUST fall through to evaluateOrFail()/recordGrantRejected below so
    // the attempt is audited and self-assignment is still checked first.
    if (
      !this.assignmentRulesService.hasAnyAssignerCapability(
        actorContext,
        roleSet.authorization
      )
    ) {
      throw new ForbiddenException(
        `Forbidden: ${this.assignmentRulesService.assignerPrivilegeFor(role)} required to assign role ${role}`,
        LogContext.PLATFORM,
        { ruleId: 'assigner-capability' }
      );
    }

    const targetHeldPlatformRoles = await this.getHeldPlatformRoles(
      roleSet,
      targetID
    );
    try {
      this.assignmentRulesService.evaluateOrFail({
        action: 'grant',
        role,
        actorContext,
        targetActorId: targetID,
        roleSetAuthorization: roleSet.authorization,
        targetActorType,
        targetServiceProfile,
        targetHeldPlatformRoles,
      });
    } catch (error) {
      await this.roleAssignmentAuditService.recordGrantRejected({
        initiatorUserId: actorContext.actorID,
        // A rejection means the actor failed at least one rule — often rule 1
        // (assigner capability), in which case it holds neither the owning
        // role nor a legacy credential and resolveInitiatorRole's throw path
        // would fire on an ALREADY-legitimate empty intersection. Best-effort
        // attribution here rather than a second throw inside error handling.
        initiatorRole: this.resolveA1A2InitiatorRoleBestEffort(
          role,
          actorContext
        ),
        targetKind: targetActorType,
        targetId: targetID,
        role,
        rejectedRule:
          error instanceof Error ? error.message : 'rule-evaluation-failed',
      });
      throw error;
    }
  }

  /** corr-server-11/spec-server-8 fix: the grant has ALREADY landed
   * (`assignActorToRole` completed) by the time this runs. If the
   * fail-closed success-audit write itself throws, the caller is told "the
   * operation was NOT applied" (`PlatformRoleAssignmentAuditException`'s
   * message) while the credential is, in fact, still granted — inverting
   * FR-027. Compensate: revert the just-applied grant before re-throwing,
   * so the operation's actual state matches what the caller is told.
   *
   * corr-server-14 fix: `wasNoOp` is `true` when the target ALREADY held
   * `role` before this call — `assignActorToRole` is idempotent
   * (role.set.service.ts's `alreadyHasRole` early return) and made no state
   * change. Compensating in that case would REVOKE a grant the target
   * legitimately held before the mutation ever ran — never the operation's
   * job. Skip compensation and just log the inconsistency: the audit write
   * failed, but there is nothing to roll back. */
  private async recordGrantSuccess(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorType: 'user' | 'organization',
    targetID: string,
    wasNoOp: boolean
  ): Promise<void> {
    try {
      await this.roleAssignmentAuditService.recordGrantOrRevoke({
        initiatorUserId: actorContext.actorID,
        initiatorRole: this.resolveA1A2InitiatorRole(role, actorContext),
        targetKind: targetActorType,
        targetId: targetID,
        role,
        outcome: 'granted',
      });
    } catch (error) {
      if (wasNoOp) {
        this.logger.error(
          `Failed grant-success audit write (role=${role}, target=${targetID}) for a GRANT that was ALREADY a no-op — the target held ${role} before this call, so no compensation is applied (that would revoke a pre-existing grant). Audit error: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
          LogContext.PLATFORM
        );
      } else {
        try {
          await this.roleSetService.removeActorFromRole(
            roleSet,
            role,
            targetID
          );
        } catch (compensationError) {
          this.logger.error(
            `Unable to compensate for a failed grant-success audit write (role=${role}, target=${targetID}): the credential remains GRANTED with no audit record. Compensation error: ${compensationError instanceof Error ? compensationError.message : String(compensationError)}`,
            compensationError instanceof Error
              ? compensationError.stack
              : undefined,
            LogContext.PLATFORM
          );
        }
      }
      throw error;
    }
  }

  private async evaluateRevokeOrFail(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorType: 'user' | 'organization',
    targetID: string
  ): Promise<void> {
    // 027-platform-role-redesign (sec-server-11 fix, narrowed by
    // corr-server-17/spec-server-18): same genuinely-unprivileged-only
    // probe as evaluateGrantOrFail, ahead of the countActorsWithRole call
    // and any rejection-audit write — see the comment there.
    if (
      !this.assignmentRulesService.hasAnyAssignerCapability(
        actorContext,
        roleSet.authorization
      )
    ) {
      throw new ForbiddenException(
        `Forbidden: ${this.assignmentRulesService.assignerPrivilegeFor(role)} required to assign role ${role}`,
        LogContext.PLATFORM,
        { ruleId: 'assigner-capability' }
      );
    }

    let isLastPlatformRolesAdminHolder = false;
    if (role === RoleName.PLATFORM_ROLES_ADMIN) {
      const holderCount = await this.roleSetService.countActorsWithRole(
        roleSet,
        RoleName.PLATFORM_ROLES_ADMIN
      );
      isLastPlatformRolesAdminHolder = holderCount <= 1;
    }
    try {
      this.assignmentRulesService.evaluateOrFail({
        action: 'revoke',
        role,
        actorContext,
        targetActorId: targetID,
        roleSetAuthorization: roleSet.authorization,
        targetActorType,
        isLastPlatformRolesAdminHolder,
      });
    } catch (error) {
      await this.roleAssignmentAuditService.recordGrantRejected({
        initiatorUserId: actorContext.actorID,
        // A rejection means the actor failed at least one rule — often rule 1
        // (assigner capability), in which case it holds neither the owning
        // role nor a legacy credential and resolveInitiatorRole's throw path
        // would fire on an ALREADY-legitimate empty intersection. Best-effort
        // attribution here rather than a second throw inside error handling.
        initiatorRole: this.resolveA1A2InitiatorRoleBestEffort(
          role,
          actorContext
        ),
        targetKind: targetActorType,
        targetId: targetID,
        role,
        rejectedRule:
          error instanceof Error ? error.message : 'rule-evaluation-failed',
      });
      throw error;
    }
  }

  /** corr-server-11/spec-server-8 fix: same shape as `recordGrantSuccess`
   * above, for the revoke side — the revoke has ALREADY landed by the time
   * this runs; a failed audit write is compensated by re-granting the role,
   * rather than leaving the revoke applied while the caller is told it
   * was not.
   *
   * corr-server-14 fix: `wasNoOp` is `true` when the target did NOT hold
   * `role` before this call — `removeActorFromRole`/`revokeCredential` is
   * idempotent and made no state change. Compensating in that case would
   * GRANT the target a role nobody asked for. Skip compensation and just
   * log the inconsistency. */
  private async recordRevokeSuccess(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorType: 'user' | 'organization',
    targetID: string,
    wasNoOp: boolean
  ): Promise<void> {
    try {
      await this.roleAssignmentAuditService.recordGrantOrRevoke({
        initiatorUserId: actorContext.actorID,
        initiatorRole: this.resolveA1A2InitiatorRole(role, actorContext),
        targetKind: targetActorType,
        targetId: targetID,
        role,
        outcome: 'revoked',
      });
    } catch (error) {
      if (wasNoOp) {
        this.logger.error(
          `Failed revoke-success audit write (role=${role}, target=${targetID}) for a REVOKE that was ALREADY a no-op — the target did not hold ${role} before this call, so no compensation is applied (that would grant a role nobody asked for). Audit error: ${error instanceof Error ? error.message : String(error)}`,
          error instanceof Error ? error.stack : undefined,
          LogContext.PLATFORM
        );
      } else {
        try {
          await this.roleSetService.assignActorToRole(
            roleSet,
            role,
            targetID,
            actorContext,
            true
          );
        } catch (compensationError) {
          this.logger.error(
            `Unable to compensate for a failed revoke-success audit write (role=${role}, target=${targetID}): the credential remains REVOKED with no audit record. Compensation error: ${compensationError instanceof Error ? compensationError.message : String(compensationError)}`,
            compensationError instanceof Error
              ? compensationError.stack
              : undefined,
            LogContext.PLATFORM
          );
        }
      }
      throw error;
    }
  }

  /** FR-025 attribution for the A1/A2 assignment mutations (T058a). */
  private resolveA1A2InitiatorRole(
    role: RoleName,
    actorContext: ActorContext
  ): PlatformAuditInitiatorRole {
    const isFeatureRole = FEATURE_FAMILY_ROLES.has(role);
    return resolveInitiatorRole({
      actorCredentialTypes: actorContext.credentials.map(
        c => c.type as AuthorizationCredential
      ),
      intendedOwners: isFeatureRole ? A2_INTENDED_OWNERS : A1_INTENDED_OWNERS,
      legacyReachers: isFeatureRole ? A2_LEGACY_REACHERS : A1_LEGACY_REACHERS,
    });
  }

  /** Same attribution, but for a REJECTED attempt: the actor may legitimately
   * hold neither the owning role nor a legacy credential (that is often
   * exactly WHY the rule engine rejected it), so the strict throw path is
   * not a defect here — fall back to `self` rather than raise a second
   * exception while already handling a rejection.
   *
   * corr-server-3/qual-server-1 fix: delegates to the SHARED
   * `resolveInitiatorRoleBestEffort` (extracted to
   * `resolve.initiator.role.ts` so `user.service.ts`'s A21 rejection path
   * uses the identical wrapper, rather than calling the strict
   * `resolveInitiatorRole` raw and leaking its throw as an internal error). */
  private resolveA1A2InitiatorRoleBestEffort(
    role: RoleName,
    actorContext: ActorContext
  ): PlatformAuditInitiatorRole {
    const isFeatureRole = FEATURE_FAMILY_ROLES.has(role);
    // Optional-chained (unlike the strict `resolveA1A2InitiatorRole` above):
    // constructing `actorCredentialTypes` happens OUTSIDE
    // `resolveInitiatorRoleBestEffort`'s own try/catch, so a raw
    // `actorContext.credentials.map` would throw before that wrapper ever
    // runs, defeating the best-effort fallback entirely.
    return resolveInitiatorRoleBestEffort({
      actorCredentialTypes: actorContext.credentials?.map(
        c => c.type as AuthorizationCredential
      ),
      intendedOwners: isFeatureRole ? A2_INTENDED_OWNERS : A1_INTENDED_OWNERS,
      legacyReachers: isFeatureRole ? A2_LEGACY_REACHERS : A1_LEGACY_REACHERS,
    });
  }

  /** The `Platform …` roles the target already holds — rule 4 (Audit Reader
   * exclusion). Only computed when the role being assigned is itself a
   * `Platform …` role or Audit Reader; PLATFORM_FAMILY_ROLES has ≤10
   * members, so this is a bounded number of credential checks. */
  private async getHeldPlatformRoles(
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    actorID: string
  ): Promise<RoleName[]> {
    const held: RoleName[] = [];
    for (const role of PLATFORM_FAMILY_ROLES) {
      if (await this.roleSetService.isInRole(actorID, roleSet, role)) {
        held.push(role);
      }
    }
    return held;
  }

  private async resetLicenseForUserAccount(user: IUser) {
    const account = await this.accountService.getAccountOrFail(user.accountID);
    const licenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(licenses);
  }

  private notifyPlatformGlobalRoleChange(
    triggeredBy: string,
    user: IUser,
    type: RoleChangeType,
    role: string
  ): void {
    const notificationInput: NotificationInputPlatformGlobalRoleChange = {
      triggeredBy,
      userID: user.id,
      type: type,
      role: role,
    };
    this.dispatchNotification(
      this.notificationPlatformAdapter.platformGlobalRoleChanged(
        notificationInput
      ),
      'platformGlobalRoleChanged'
    );
  }

  /**
   * Wraps a fire-and-forget notification dispatch with a `.catch` so an
   * unhandled rejection from a downstream notification adapter (e.g. a user
   * row with a null profile → TypeError while building the payload) does not
   * crash the Node process.
   *
   * The notification is still side-effectful: failures are logged at ERROR
   * with structured details so monitoring can pick them up. Notifications
   * are intentionally not awaited at the resolver level; we don't want a
   * downstream notification problem to fail the user-facing mutation.
   */
  private dispatchNotification(
    promise: Promise<unknown>,
    eventLabel: string
  ): void {
    void promise.catch(error => {
      const stack = error instanceof Error ? (error.stack ?? '') : '';
      this.logger.error?.(
        {
          message: 'Notification dispatch failed',
          event: eventLabel,
          error: String(error),
        },
        stack,
        LogContext.NOTIFICATIONS
      );
    });
  }
}
