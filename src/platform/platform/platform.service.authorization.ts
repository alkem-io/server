import {
  CREDENTIAL_RULE_PLATFORM_CREATE_ORGANIZATION,
  CREDENTIAL_RULE_TYPES_FEATURE_ROLE_ASSIGN,
  CREDENTIAL_RULE_TYPES_FEATURE_ROLE_HOLDERS_READ,
  CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE,
  CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_VIRTUAL_ASSISTANT,
  CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS,
  CREDENTIAL_RULE_TYPES_PLATFORM_AUDIT_READ,
  CREDENTIAL_RULE_TYPES_PLATFORM_AUTH_RESET,
  CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER,
  CREDENTIAL_RULE_TYPES_PLATFORM_FORUM_MANAGE,
  CREDENTIAL_RULE_TYPES_PLATFORM_OPERATIONS_ADMIN,
  CREDENTIAL_RULE_TYPES_PLATFORM_READ_REGISTERED,
  CREDENTIAL_RULE_TYPES_PLATFORM_ROLE_HOLDERS_READ,
  CREDENTIAL_RULE_TYPES_PLATFORM_ROLES_ASSIGN,
  CREDENTIAL_RULE_TYPES_PLATFORM_SUPPORT_ORG_RESOURCES,
  CREDENTIAL_RULE_TYPES_PLATFORM_USERS_ADMIN,
  CREDENTIAL_RULE_TYPES_SET_SERVICE_PROFILE,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RoleSetType } from '@common/enums/role.set.type';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetAuthorizationService } from '@domain/access/role-set/role.set.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { MessagingAuthorizationService } from '@domain/communication/messaging/messaging.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { LibraryAuthorizationService } from '@library/library/library.service.authorization';
import { Injectable } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ForumAuthorizationService } from '@platform/forum/forum.service.authorization';
import { LicensingFrameworkAuthorizationService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service.authorization';
import { PlatformService } from './platform.service';

@Injectable()
export class PlatformAuthorizationService {
  constructor(
    private readonly authorizationPolicyService: AuthorizationPolicyService,
    private readonly platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private readonly forumAuthorizationService: ForumAuthorizationService,
    private readonly platformService: PlatformService,
    private readonly storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private readonly libraryAuthorizationService: LibraryAuthorizationService,
    private readonly licensingFrameworkAuthorizationService: LicensingFrameworkAuthorizationService,
    private readonly templatesManagerAuthorizationService: TemplatesManagerAuthorizationService,
    private readonly roleSetAuthorizationService: RoleSetAuthorizationService,
    private readonly messagingAuthorizationService: MessagingAuthorizationService
  ) {}

  async applyAuthorizationPolicy(): Promise<IAuthorizationPolicy[]> {
    const platform = await this.platformService.getPlatformOrFail({
      relations: {
        authorization: true,
        forum: true,
        library: true,
        storageAggregator: true,
        licensingFramework: true,
        templatesManager: true,
        roleSet: true,
        messaging: true,
      },
    });

    if (
      !platform.authorization ||
      !platform.library ||
      !platform.forum ||
      !platform.storageAggregator ||
      !platform.licensingFramework ||
      !platform.templatesManager ||
      !platform.roleSet ||
      !platform.messaging
    )
      throw new RelationshipNotFoundException(
        `Unable to load entities for platform: ${platform.id} `,
        LogContext.PLATFORM
      );

    const updatedAuthorizations: IAuthorizationPolicy[] = [];
    platform.authorization = this.authorizationPolicyService.reset(
      platform.authorization
    );
    platform.authorization =
      this.platformAuthorizationPolicyService.inheritRootAuthorizationPolicy(
        platform.authorization
      );
    platform.authorization = await this.appendCredentialRules(
      platform.authorization
    );
    updatedAuthorizations.push(platform.authorization);

    const libraryUpdatedAuthorization =
      await this.libraryAuthorizationService.applyAuthorizationPolicy(
        platform.library,
        platform.authorization
      );
    updatedAuthorizations.push(libraryUpdatedAuthorization);

    const templatesManagerAuthorizations =
      await this.templatesManagerAuthorizationService.applyAuthorizationPolicy(
        platform.templatesManager.id,
        platform.authorization
      );
    updatedAuthorizations.push(...templatesManagerAuthorizations);

    const additionalRoleSetCredentialRules =
      await this.createAdditionalRoleSetCredentialRules(platform.roleSet);
    const roleSetAuthorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicy(
        platform.roleSet.id,
        platform.authorization,
        additionalRoleSetCredentialRules
      );
    updatedAuthorizations.push(...roleSetAuthorizations);

    const forumUpdatedAuthorizations =
      await this.forumAuthorizationService.applyAuthorizationPolicy(
        platform.forum,
        platform.authorization
      );
    updatedAuthorizations.push(...forumUpdatedAuthorizations);

    let platformStorageAuth =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        platform.authorization
      );
    platformStorageAuth =
      this.extendStorageAuthorizationPolicy(platformStorageAuth);
    platformStorageAuth =
      this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
        platformStorageAuth,
        AuthorizationPrivilege.READ
      );

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        platform.storageAggregator,
        platformStorageAuth
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const platformLicensingAuthorizations =
      await this.licensingFrameworkAuthorizationService.applyAuthorizationPolicy(
        platform.licensingFramework,
        platform.authorization
      );
    updatedAuthorizations.push(...platformLicensingAuthorizations);

    const messagingAuthorizations =
      await this.messagingAuthorizationService.applyAuthorizationPolicy(
        platform.messaging,
        platform.authorization
      );
    updatedAuthorizations.push(...messagingAuthorizations);

    return updatedAuthorizations;
  }

  private async appendCredentialRules(
    authorization: IAuthorizationPolicy
  ): Promise<IAuthorizationPolicy> {
    const credentialRules = this.createPlatformCredentialRules();

    const credentialRuleInteractiveGuidance =
      await this.createCredentialRuleInteractiveGuidance();
    credentialRules.push(credentialRuleInteractiveGuidance);

    const credentialRuleVirtualAssistantAccess =
      this.createCredentialRuleVirtualAssistantAccess();
    credentialRules.push(credentialRuleVirtualAssistantAccess);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      credentialRules
    );
  }

  private extendStorageAuthorizationPolicy(
    storageAuthorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    if (!storageAuthorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found for Platform Communication',
        LogContext.PLATFORM
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Any member can upload
    const registeredUserUpload =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.FILE_UPLOAD, AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_PLATFORM_FILE_UPLOAD_ANY_USER
      );
    // Cascade so the privilege is picked up on the direct storage bucket
    registeredUserUpload.cascade = true;
    newRules.push(registeredUserUpload);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      storageAuthorization,
      newRules
    );

    return storageAuthorization;
  }

  private async createCredentialRuleInteractiveGuidance(): Promise<IAuthorizationPolicyRuleCredential> {
    const userChatGuidanceAccessCredential = {
      type: AuthorizationCredential.GLOBAL_REGISTERED,
      resourceID: '',
    };

    const userChatGuidanceAccessPrivilegeRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ACCESS_INTERACTIVE_GUIDANCE],
        [userChatGuidanceAccessCredential],
        CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_GUIDANCE
      );
    userChatGuidanceAccessPrivilegeRule.cascade = false;

    return userChatGuidanceAccessPrivilegeRule;
  }

  /**
   * 004-web-ai-assistant (FR-027): grant ACCESS_VIRTUAL_ASSISTANT to platform
   * admins OR holders of the admin-assignable ASSISTANT_ACCESS credential
   * (the PLATFORM_ASSISTANT_ACCESS role). Anchored to GLOBAL_ADMIN — NOT
   * GLOBAL_REGISTERED — so out of the box only platform admins may use the
   * web AI assistant. Mirrors createCredentialRuleInteractiveGuidance, but the
   * criteria are the two access-bearing credentials (OR semantics).
   */
  private createCredentialRuleVirtualAssistantAccess(): IAuthorizationPolicyRuleCredential {
    const virtualAssistantAccessRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.ACCESS_VIRTUAL_ASSISTANT],
        [
          // 027-platform-role-redesign (T035, closed by T076/T077): the
          // re-anchor is complete — `global-admin` and the legacy
          // `assistant-access` credential are gone, and Feature Virtual
          // Assistant (spec row 12) is the sole holder.
          {
            type: AuthorizationCredential.FEATURE_VIRTUAL_ASSISTANT,
            resourceID: '',
          },
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ACCESS_VIRTUAL_ASSISTANT
      );
    virtualAssistantAccessRule.cascade = false;

    return virtualAssistantAccessRule;
  }

  private createPlatformCredentialRules(): IAuthorizationPolicyRuleCredential[] {
    const credentialRules: IAuthorizationPolicyRuleCredential[] = [];

    // 027-platform-role-redesign (T074/T076, FR-007(d)): the `PLATFORM_ADMIN`
    // catch-all rule that stood here is DELETED. It granted one privilege to
    // {global-admin, global-support, global-license-manager} and that one
    // privilege gated ~26 unrelated surfaces across nine families — the single
    // widest over-grant this feature exists to break apart. Every surface it
    // gated now names its own family's privilege (T074), and each of those has
    // its own rule below or on the entity policy that owns it.
    //
    // A7's support privilege gets a platform-level rule because the
    // `platformAdmin.organizations` listing is gated on it: Support needs the
    // organization list to reach the org-owned resources spec row 7 gives it.
    // Holder set unchanged (`platform-support` alone) — this names where the
    // privilege is checked, it does not widen who holds it.
    const platformSupportOrgResources =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_SUPPORT_ORG_RESOURCES],
        [AuthorizationCredential.PLATFORM_SUPPORT],
        CREDENTIAL_RULE_TYPES_PLATFORM_SUPPORT_ORG_RESOURCES
      );
    platformSupportOrgResources.cascade = false;
    credentialRules.push(platformSupportOrgResources);

    // Operational & maintenance mutation family — dedicated privilege, own
    // rule (never merged into the platformAdmin rule above). Grant set mirrors
    // today's PLATFORM_ADMIN holders plus the Platform Operations Admin role.
    const platformOperationsAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_OPERATIONS_ADMIN],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_OPERATIONS_ADMIN
      );
    platformOperationsAdmin.cascade = false;
    credentialRules.push(platformOperationsAdmin);

    // Allow global admins to manage the platform settings
    // Separate rule + privilege as can imagine that we later define this as a separate
    // platform role
    // 027-platform-role-redesign (T035, T045): re-anchored onto
    // platform-settings-admin, additively — legacy credentials retained
    // until Slice B (T076). T045 consolidates the A10 family's five
    // surfaces (updatePlatformSettings + the 4 iframe/notification-blacklist
    // mutations, platform.resolver.mutations.ts) onto this ONE privilege;
    // those 4 previously rode the PLATFORM_ADMIN catch-all, whose legacy
    // grant set (GLOBAL_ADMIN, GLOBAL_SUPPORT, GLOBAL_LICENSE_MANAGER)
    // differs from updatePlatformSettings' own (GLOBAL_ADMIN,
    // GLOBAL_PLATFORM_MANAGER) — so GLOBAL_SUPPORT and
    // GLOBAL_LICENSE_MANAGER are added here too, to the union of both, never
    // narrowing either surface's pre-existing legacy reach.
    const platformSettingsAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_SETTINGS_ADMIN],
        [AuthorizationCredential.PLATFORM_SETTINGS_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_ADMINS
      );
    platformSettingsAdmin.cascade = false;
    credentialRules.push(platformSettingsAdmin);

    // 027-platform-role-redesign (T035, A19 read privilege) — audit-read,
    // re-anchoring the audit read surface off the retiring PLATFORM_ADMIN
    // catch-all (FR-028). Read-only, held by no other role.
    const platformAuditRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_AUDIT_READ],
        [AuthorizationCredential.PLATFORM_AUDIT_READER],
        CREDENTIAL_RULE_TYPES_PLATFORM_AUDIT_READ
      );
    platformAuditRead.cascade = false;
    credentialRules.push(platformAuditRead);

    // 027-platform-role-redesign (T035, A21) — the service-profile marker
    // extraction. Held by Roles Admin alone (plus legacy, additively).
    const setServiceProfile =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.SET_SERVICE_PROFILE],
        [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
        CREDENTIAL_RULE_TYPES_SET_SERVICE_PROFILE
      );
    setServiceProfile.cascade = false;
    credentialRules.push(setServiceProfile);

    // 027-platform-role-redesign (T061/T062, A4/A5): PLATFORM_USERS_ADMIN
    // on the PLATFORM's own authorization tree — distinct from (but the
    // same grant set as) T060's per-USER grant in
    // user.service.authorization.ts. Three A4/A5 surfaces check this
    // privilege directly against the platform policy rather than against
    // any individual user's own authorization: adminUserEmailChange /
    // …DriftResolve (T061), adminIdentityDeleteKratosIdentity and
    // adminUserAccountDelete (T062). Grant set is the UNION of A4's legacy
    // reachers (today's PLATFORM_ADMIN: GLOBAL_ADMIN, GLOBAL_SUPPORT,
    // GLOBAL_LICENSE_MANAGER) and A5's (today's PLATFORM_SETTINGS_ADMIN:
    // adds GLOBAL_PLATFORM_MANAGER) — identical to T060's set, kept in sync
    // deliberately.
    const platformUsersAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_USERS_ADMIN],
        [AuthorizationCredential.PLATFORM_USERS_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_USERS_ADMIN
      );
    platformUsersAdmin.cascade = false;
    credentialRules.push(platformUsersAdmin);

    // 027-platform-role-redesign (T035, A15, FR-007(e)) — the platform
    // forum's OWN privilege. NOT optional/cosmetic: the forum's only
    // platform-side path used to be the GLOBAL_SUPPORT subtree cascade as
    // ordinary UPDATE, which Slice B (T073) has now deleted — this rule is
    // what keeps FR-008(d) alive for Platform Support. Cascades to the forum
    // (mirroring the reach the deleted cascade had).
    const platformForumManage =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_FORUM_MANAGE],
        [AuthorizationCredential.PLATFORM_SUPPORT],
        CREDENTIAL_RULE_TYPES_PLATFORM_FORUM_MANAGE
      );
    platformForumManage.cascade = true;
    credentialRules.push(platformForumManage);

    // 027-platform-role-redesign (T073, Slice B): the `global-support`
    // platform-SUBTREE cascade that stood here — cascading CRUD over
    // platform, forum, library, templates-manager, role-set, storage,
    // messaging and (transitively) the licensing tree — is DELETED. Support's
    // reach is now A6, A7 and A15 only, each through its own named
    // privilege. Everything that rode this cascade was re-anchored in Slice
    // A: the forum onto `PLATFORM_FORUM_MANAGE` immediately above (T035 +
    // T049), the rest onto the per-family privileges. Do not reintroduce a
    // subtree cascade to "restore" a capability — name the surface and gate
    // it, or `surface.drift.spec.ts` and the A15 denial cells will disagree
    // with you.

    // AUTHORIZATION_RESET holders: GLOBAL_ADMIN, GLOBAL_SUPPORT,
    // GLOBAL_LICENSE_MANAGER and PLATFORM_OPERATIONS_ADMIN.
    // GA/GS/GLM are carried over because the platform reset mutations were
    // previously gated on PLATFORM_ADMIN (GA/GS/GLM); re-gating them on
    // AUTHORIZATION_RESET must not strip any of them of access they already
    // had. PLATFORM_OPERATIONS_ADMIN is the new grant added by workspace#032-platform-ops-admin-role.
    const platformResetAuth =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.AUTHORIZATION_RESET],
        [AuthorizationCredential.PLATFORM_OPERATIONS_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_AUTH_RESET
      );
    platformResetAuth.cascade = false;
    credentialRules.push(platformResetAuth);

    // Who can receive the platform admin notifications. T076 (Slice B):
    // re-anchored off the three legacy credentials onto the roles that ACT on
    // platform-wide events — the same set `notification.recipients.service.ts`
    // resolves. Audit Reader is excluded on purpose (it reviews the trail, it
    // does not operate) and so is Spaces Reader (a service account).
    const platformAdminNotifications =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN],
        [
          AuthorizationCredential.PLATFORM_SUPPORT,
          AuthorizationCredential.PLATFORM_USERS_ADMIN,
          AuthorizationCredential.PLATFORM_CONTENT_FULL_ACCESS,
        ],
        ' Receive notifications platform admin'
      );
    platformAdminNotifications.cascade = false;
    credentialRules.push(platformAdminNotifications);

    // Allow organization admins to access organization admin notification settings
    const receiveNotificationsOrganizationAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ORGANIZATION_ADMIN],
        [AuthorizationCredential.ORGANIZATION_ADMIN],
        'Receive notifications organization admin'
      );
    receiveNotificationsOrganizationAdmin.cascade = false;
    credentialRules.push(receiveNotificationsOrganizationAdmin);

    // Allow space admins to access space admin notification settings
    const receiveNotificationsSpaceAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_SPACE_ADMIN],
        [AuthorizationCredential.SPACE_ADMIN],
        'Receive notifications space admin'
      );
    receiveNotificationsSpaceAdmin.cascade = false;
    credentialRules.push(receiveNotificationsSpaceAdmin);

    // Allow space leads to access space lead notification settings
    const receiveNotificationsSpaceLead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_SPACE_LEAD],
        [AuthorizationCredential.SPACE_LEAD],
        'Receive notifications space lead'
      );
    receiveNotificationsSpaceLead.cascade = false;
    credentialRules.push(receiveNotificationsSpaceLead);

    // Allow all registered users to query non-protected user information
    const userNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ_USERS],
        [AuthorizationCredential.GLOBAL_REGISTERED],
        CREDENTIAL_RULE_TYPES_PLATFORM_READ_REGISTERED
      );
    userNotInherited.cascade = false;
    credentialRules.push(userNotInherited);

    // 027-platform-role-redesign (T035, A6 create half): re-anchored onto
    // platform-support + feature-organization-creator, additively. Kept
    // separate from DELETE_ORGANIZATION (organization.service.authorization.ts,
    // T039) so Feature Organization Creator can never acquire the delete half.
    const createOrg =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.CREATE_ORGANIZATION],
        [
          AuthorizationCredential.PLATFORM_SUPPORT,
          AuthorizationCredential.FEATURE_ORGANIZATION_CREATOR,
        ],
        CREDENTIAL_RULE_PLATFORM_CREATE_ORGANIZATION
      );
    createOrg.cascade = false;
    credentialRules.push(createOrg);

    return credentialRules;
  }

  private async createAdditionalRoleSetCredentialRules(
    roleSet: IRoleSet
  ): Promise<IAuthorizationPolicyRuleCredential[]> {
    if (roleSet.type !== RoleSetType.PLATFORM) {
      throw new RelationshipNotFoundException(
        `RoleSet of wrong type passed: ${roleSet.id}`,
        LogContext.ROLES
      );
    }
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage global privileges, access Platform mgmt.
    // 027-platform-role-redesign (T034): additively extended with
    // platform-roles-admin — `{owning role} ∪ legacy` (FR-007(d)). This
    // privilege gates SIX A1 surfaces, not two: the two *PlatformRole*
    // mutations below AND the four FR-022 credential mutations
    // (admin.authorization.resolver.mutations.ts) — T034a pins those four
    // to the legacy credential ahead of this check so the widening here
    // cannot reach them (research C10, D24, thirteenth analyze pass).
    const globalAdminNotInherited =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ROLES_ASSIGN],
        [AuthorizationCredential.PLATFORM_ROLES_ADMIN],
        CREDENTIAL_RULE_TYPES_PLATFORM_ROLES_ASSIGN
      );
    globalAdminNotInherited.cascade = false;
    newRules.push(globalAdminNotInherited);

    // 027-platform-role-redesign (T034): A2 — low-risk Feature-role
    // assignment. Owned by BOTH Platform Users Admin and Platform Roles
    // Admin (spec row 6/1). Wholly new privilege — no legacy reacher.
    const featureRoleAssign =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.FEATURE_ROLE_ASSIGN],
        [
          AuthorizationCredential.PLATFORM_USERS_ADMIN,
          AuthorizationCredential.PLATFORM_ROLES_ADMIN,
        ],
        CREDENTIAL_RULE_TYPES_FEATURE_ROLE_ASSIGN
      );
    featureRoleAssign.cascade = false;
    newRules.push(featureRoleAssign);

    // 027-platform-role-redesign (T034, A20): read the `Platform …` holder
    // lists — shared by Roles Admin and Audit Reader (research D9). Legacy
    // reach is via the broad grants FR-007 removes (today's plain READ on
    // the platform role-set, held by every legacy `global-*` credential
    // through the root god-mode rule).
    const platformRoleHoldersRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ROLE_HOLDERS_READ],
        [
          AuthorizationCredential.PLATFORM_ROLES_ADMIN,
          AuthorizationCredential.PLATFORM_AUDIT_READER,
        ],
        CREDENTIAL_RULE_TYPES_PLATFORM_ROLE_HOLDERS_READ
      );
    platformRoleHoldersRead.cascade = false;
    newRules.push(platformRoleHoldersRead);

    // 027-platform-role-redesign (T034, A20b): the second, dedicated
    // holder-list read privilege for the `Feature …` role set — kept
    // separate from FEATURE_ROLE_ASSIGN so read and assign stay
    // independently grantable (sixth clarification pass). NOT granted to
    // Roles Admin / Audit Reader here — they reach the Feature holder lists
    // through PLATFORM_ROLE_HOLDERS_READ by subsumption (D9); adding them
    // here too would be a redundant, harmless-but-confusing second path.
    const featureRoleHoldersRead =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.FEATURE_ROLE_HOLDERS_READ],
        [AuthorizationCredential.PLATFORM_USERS_ADMIN],
        CREDENTIAL_RULE_TYPES_FEATURE_ROLE_HOLDERS_READ
      );
    featureRoleHoldersRead.cascade = false;
    newRules.push(featureRoleHoldersRead);

    // 027-platform-role-redesign (T076, Slice B): the bare `GRANT` rule on the
    // platform role-set is DELETED. `global-admin`'s blanket GRANT here IS the
    // broad grant FR-007(c) exists to split apart — it is replaced, above, by
    // `PLATFORM_ROLES_ASSIGN` (Roles Admin, the `Platform …` half) and
    // `FEATURE_ROLE_ASSIGN` (Users Admin or Roles Admin, the `Feature …` half).
    // Re-anchoring it to any role would restore a single privilege that spans
    // both halves and bypasses the one-way separation in FR-003.

    return newRules;
  }
}
