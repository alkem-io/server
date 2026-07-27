import { RoleChangeType } from '@alkemio/notifications-lib';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { RoleName } from '@common/enums/role.name';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { ActorService } from '@domain/actor/actor/actor.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { IUser } from '@domain/community/user/user.interface';
import { PlatformAuditInitiatorRole } from '@domain/community/user-email-change/enums/platform.audit.initiator.role';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { PlatformService } from '@platform/platform/platform.service';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.global.role.change';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { resolveInitiatorRole } from '@src/platform-admin/platform-audit-attribution/resolve.initiator.role';
import { PlatformRoleAssignmentAuditService } from '@src/platform-admin/platform-role-assignment-audit/platform.role.assignment.audit.service';
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
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private platformService: PlatformService,
    private assignmentRulesService: PlatformRoleAssignmentRulesService,
    private roleAssignmentAuditService: PlatformRoleAssignmentAuditService
  ) {}

  @Mutation(() => IUser, {
    description: 'Assigns a User to a role on the Platform.',
  })
  async assignPlatformRoleToUser(
    @CurrentActor() actorContext: ActorContext,
    @Args('roleData') roleData: AssignPlatformRoleInput
  ): Promise<IUser> {
    const roleSet = await this.platformService.getRoleSetOrFail();

    if (RULE_ENGINE_GOVERNED_ROLES.has(roleData.role)) {
      // 027-platform-role-redesign (T030-T032): the target role model routes
      // through the shared five-rule engine + fail-closed audit write.
      // Every OTHER role (legacy `global-*`, `platform-beta-tester`,
      // `platform-vc-campaign`, `platform-assistant-access`) keeps its
      // EXACT pre-existing gating below — Slice A is additive-only.
      const targetUser = await this.userLookupService.getUserByIdOrFail(
        roleData.actorID
      );
      await this.evaluateAndAuditGrant(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID,
        targetUser.serviceProfile
      );
    } else {
      let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;

      if (
        roleData.role === RoleName.PLATFORM_BETA_TESTER ||
        roleData.role === RoleName.PLATFORM_VC_CAMPAIGN
      ) {
        privilegeRequired = AuthorizationPrivilege.GRANT;
      }

      this.authorizationService.grantAccessOrFail(
        actorContext,
        roleSet.authorization,
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

    if (RULE_ENGINE_GOVERNED_ROLES.has(roleData.role)) {
      await this.evaluateAndAuditRevoke(
        actorContext,
        roleSet,
        roleData.role,
        'user',
        roleData.actorID
      );
    } else {
      let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
      let extendedAuthorization = roleSet.authorization;

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
    const roleSet = await this.platformService.getRoleSetOrFail();

    await this.evaluateAndAuditGrant(
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
    const roleSet = await this.platformService.getRoleSetOrFail();

    await this.evaluateAndAuditRevoke(
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

    return await this.organizationLookupService.getOrganizationByIdOrFail(
      roleData.actorID
    );
  }

  /** Shared by both grant surfaces (user + organization): evaluate the five
   * assignment rules, then write the FAIL-CLOSED audit row (FR-027) BEFORE
   * the actual grant — an audit-write failure aborts the grant rather than
   * silently outliving its own record. */
  private async evaluateAndAuditGrant(
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

    await this.roleAssignmentAuditService.recordGrantOrRevoke({
      initiatorUserId: actorContext.actorID,
      initiatorRole: this.resolveA1A2InitiatorRole(role, actorContext),
      targetKind: targetActorType,
      targetId: targetID,
      role,
      outcome: 'granted',
    });
  }

  private async evaluateAndAuditRevoke(
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

    await this.roleAssignmentAuditService.recordGrantOrRevoke({
      initiatorUserId: actorContext.actorID,
      initiatorRole: this.resolveA1A2InitiatorRole(role, actorContext),
      targetKind: targetActorType,
      targetId: targetID,
      role,
      outcome: 'revoked',
    });
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
   * exception while already handling a rejection. */
  private resolveA1A2InitiatorRoleBestEffort(
    role: RoleName,
    actorContext: ActorContext
  ): PlatformAuditInitiatorRole {
    try {
      return this.resolveA1A2InitiatorRole(role, actorContext);
    } catch {
      return PlatformAuditInitiatorRole.SELF;
    }
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
    await this.notificationPlatformAdapter.platformGlobalRoleChanged(
      notificationInput
    );
  }
}
