import { RoleChangeType } from '@alkemio/notifications-lib';
import { GLOBAL_POLICY_PLATFORM_ROLE_LEGACY_GRANT_GLOBAL_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationRoleGlobal } from '@common/enums/authorization.credential.global';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
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
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
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
 *  - A1 (`platform-*` role assign/revoke, `GRANT_GLOBAL_ADMINS`): owned by
 *    Platform Roles Admin alone, reachable in Slice A ONLY by the legacy
 *    `global-admin` credential — GRANT_GLOBAL_ADMINS' pre-existing sole
 *    holder, NOT global-support/global-license-manager, which never held it.
 *  - A2 (`feature-*` role assign/revoke, `FEATURE_ROLE_ASSIGN`): owned by
 *    BOTH Platform Users Admin and Platform Roles Admin; no legacy reacher
 *    (`FEATURE_ROLE_ASSIGN` is a wholly new privilege, T007).
 */
const A1_INTENDED_OWNERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.PLATFORM_ROLES_ADMIN,
];
const A1_LEGACY_REACHERS: readonly AuthorizationCredential[] = [
  AuthorizationCredential.GLOBAL_ADMIN,
];
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
  /** 027-platform-role-redesign (sec-server-2/corr-server-1 fix): the legacy
   * `global-*` role branch of assign/removePlatformRoleFromUser checks
   * GRANT_GLOBAL_ADMINS against THIS resolver-local, hardcoded IN_MEMORY
   * policy — built once from a fixed one-element `[GLOBAL_ADMIN]` array —
   * rather than against `roleSet.authorization`, whose GRANT_GLOBAL_ADMINS
   * credential rule T034 widens to also admit PLATFORM_ROLES_ADMIN. Mirrors
   * the FR-022 pin in admin.authorization.resolver.mutations.ts (T034a):
   * widening the shared rule therefore cannot reach legacy role assignment.
   * Do NOT replace this with `roleSet.authorization` — that IS the widened
   * policy and doing so reopens exactly this hole. */
  private legacyGlobalAdminPolicy: IAuthorizationPolicy;

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
  ) {
    this.legacyGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
        GLOBAL_POLICY_PLATFORM_ROLE_LEGACY_GRANT_GLOBAL_ADMIN
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
      let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
      // 027-platform-role-redesign (sec-server-2/corr-server-1 fix): every
      // legacy `global-*` role (and PLATFORM_OPERATIONS_ADMIN /
      // PLATFORM_ASSISTANT_ACCESS) checks GRANT_GLOBAL_ADMINS against the
      // resolver-local, un-widened [GLOBAL_ADMIN] policy — NOT
      // roleSet.authorization, which T034 widened to also admit
      // PLATFORM_ROLES_ADMIN. PLATFORM_BETA_TESTER/PLATFORM_VC_CAMPAIGN keep
      // their pre-existing, deliberately wide-open GRANT check against
      // roleSet.authorization (unchanged, additive-only).
      let authorizationToCheck: IAuthorizationPolicy | undefined =
        this.legacyGlobalAdminPolicy;

      if (
        roleData.role === RoleName.PLATFORM_BETA_TESTER ||
        roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
      ) {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        authorizationToCheck = roleSet.authorization;
      }

      this.authorizationService.grantAccessOrFail(
        actorContext,
        authorizationToCheck,
        privilegeRequired,
        `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
      );
    }

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
        roleData.actorID
      );
    }

    const user = await this.userLookupService.getUserByIdOrFail(
      roleData.actorID
    );
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN ||
      // 027-platform-role-redesign (T040a): Feature Beta Tester carries the
      // SAME beta/trial license entitlement as the legacy role it replaces
      // (spec §Target global role model row 11). Without this, the target
      // role would be inert once Slice B drops platform-beta-tester (FR-009,
      // SC-007) — this is the one target role whose capability lives in a
      // manual entitlement grant rather than an authorization policy.
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
      await this.evaluateRevokeOrFail(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID
      );
    } else {
      let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
      // 027-platform-role-redesign (sec-server-2/corr-server-1 fix): legacy
      // `global-*` roles check against the resolver-local, un-widened
      // [GLOBAL_ADMIN] policy rather than roleSet.authorization — see
      // legacyGlobalAdminPolicy above.
      let extendedAuthorization: IAuthorizationPolicy =
        this.legacyGlobalAdminPolicy;

      if (
        roleData.role === RoleName.PLATFORM_BETA_TESTER ||
        roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
      ) {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        // Extend the authorization policy with a credential rule to assign the GRANT privilege
        // to the user specified in the incoming mutation. Then if it is the same user as is logged
        // in then the user will have the GRANT privilege + so can carry out the mutation
        extendedAuthorization =
          this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
            roleSet,
            roleData.actorID
          );
      }

      this.authorizationService.grantAccessOrFail(
        actorContext,
        extendedAuthorization,
        privilegeRequired,
        `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
      );
    }

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
        roleData.actorID
      );
    }

    const user = await this.userLookupService.getUserByIdOrFail(
      roleData.actorID
    );
    if (
      roleData.role === RoleName.PLATFORM_BETA_TESTER ||
      roleData.role === RoleName.PLATFORM_VC_CAMPAIGN ||
      roleData.role === RoleName.FEATURE_BETA_TESTER // T040a
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
    await this.assertOrganizationSurfaceOrFail(roleData.role, roleData.actorID);
    const roleSet = await this.platformService.getRoleSetOrFail();

    await this.evaluateGrantOrFail(
      actorContext,
      roleSet,
      roleData.role,
      'organization',
      roleData.actorID
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
      roleData.actorID
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
    await this.assertOrganizationSurfaceOrFail(roleData.role, roleData.actorID);
    const roleSet = await this.platformService.getRoleSetOrFail();

    await this.evaluateRevokeOrFail(
      actorContext,
      roleSet,
      roleData.role,
      'organization',
      roleData.actorID
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
      roleData.actorID
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
   * the shared, Slice-A-widened `GRANT_GLOBAL_ADMINS` check on
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
   * audit row against `subjectOrganizationId` with a user's id. */
  private async assertOrganizationSurfaceOrFail(
    role: RoleName,
    targetActorId: string
  ): Promise<void> {
    if (!FEATURE_FAMILY_ROLES.has(role)) {
      throw new ForbiddenException(
        `Rejected: role ${role} may not be assigned or removed through the organization surface`,
        LogContext.PLATFORM,
        { ruleId: 'holder-kind' }
      );
    }
    const actorType =
      await this.actorLookupService.getActorTypeByIdOrFail(targetActorId);
    if (actorType !== ActorType.ORGANIZATION) {
      throw new ForbiddenException(
        `Rejected: target actor for role ${role} is not an organization`,
        LogContext.PLATFORM,
        { ruleId: 'holder-kind' }
      );
    }
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
   * so the operation's actual state matches what the caller is told. */
  private async recordGrantSuccess(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorType: 'user' | 'organization',
    targetID: string
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
      try {
        await this.roleSetService.removeActorFromRole(roleSet, role, targetID);
      } catch (compensationError) {
        this.logger.error(
          `Unable to compensate for a failed grant-success audit write (role=${role}, target=${targetID}): the credential remains GRANTED with no audit record. Compensation error: ${compensationError instanceof Error ? compensationError.message : String(compensationError)}`,
          compensationError instanceof Error
            ? compensationError.stack
            : undefined,
          LogContext.PLATFORM
        );
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
   * was not. */
  private async recordRevokeSuccess(
    actorContext: ActorContext,
    roleSet: Awaited<ReturnType<PlatformService['getRoleSetOrFail']>>,
    role: RoleName,
    targetActorType: 'user' | 'organization',
    targetID: string
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

  /**
   * NOTE: both call sites invoke this WITHOUT awaiting (pre-existing, `bd8b9d839d`
   * / `bd8314b35`, also on develop) — the notification is deliberately
   * fire-and-forget so a notification outage cannot fail a role change.
   *
   * But a floating promise that REJECTS is an unhandled rejection, and Node's
   * default `--unhandled-rejections=throw` turns that into a HARD PROCESS EXIT.
   * Observed live twice during 027 verification: revoking a platform role from a
   * user whose `profile` relation resolves null crashes the whole server with
   * `TypeError: Cannot read properties of null (reading 'displayName')` in
   * `NotificationExternalAdapter.getUserPayloadOrFail`.
   *
   * 027 did not introduce the bug but makes it routine: this feature's entire
   * subject is platform role grant/revoke, so the path is now hot (fixture
   * teardown revoking 13 roles across many users reproduces it every run).
   * Containing the rejection here restores the intended fire-and-forget
   * semantics — the failure is logged, the mutation still succeeds, the process
   * survives. The null-profile cause itself is a separate defect in the
   * notification adapter and is reported, not silently absorbed.
   */
  private async notifyPlatformGlobalRoleChange(
    triggeredBy: string,
    user: IUser,
    type: RoleChangeType,
    role: string
  ) {
    const notificationInput: NotificationInputPlatformGlobalRoleChange = {
      triggeredBy,
      userID: user.id,
      type: type,
      role: role,
    };
    try {
      await this.notificationPlatformAdapter.platformGlobalRoleChanged(
        notificationInput
      );
    } catch (error: any) {
      this.logger.error(
        `Unable to dispatch platform global role change notification (user=${user.id}, role=${role}, type=${type}): ${error?.message}`,
        error?.stack,
        LogContext.NOTIFICATIONS
      );
    }
  }
}
