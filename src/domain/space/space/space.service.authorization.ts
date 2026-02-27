import {
  CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
  POLICY_RULE_READ_ABOUT,
  POLICY_RULE_SPACE_CREATE_SUBSPACE,
} from '@common/constants';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { EntityNotFoundException } from '@common/exceptions';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { PlatformRolesAccessService } from '@domain/access/platform-roles-access/platform.roles.access.service';
import { IRoleSet } from '@domain/access/role-set';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SpaceAboutAuthorizationService } from '../space.about/space.about.service.authorization';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { ISpace } from './space.interface';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private roleSetService: RoleSetService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private spaceAboutAuthorizationService: SpaceAboutAuthorizationService,
    private templatesManagerAuthorizationService: TemplatesManagerAuthorizationService,
    private spaceLookupService: SpaceLookupService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    private platformRolesAccessService: PlatformRolesAccessService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    spaceID: string,
    providedParentAuthorization?: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const space = await this.spaceLookupService.getSpaceOrFail(spaceID, {
      relations: {
        actor: {
          authorization: {
            parentAuthorizationPolicy: true,
          },
        },
        parentSpace: {
          community: {
            roleSet: true,
          },
          parentSpace: true,
        },
        community: {
          roleSet: true,
        },
        collaboration: true,
        about: {
          profile: true,
        },
        storageAggregator: true,
        templatesManager: true,
        subspaces: true,
        license: true,
        account: true,
      },
    });
    if (
      !space.authorization ||
      !space.community ||
      !space.community.roleSet ||
      !space.subspaces ||
      !space.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const spaceVisibility = space.visibility;
    const spaceSettings = space.settings;
    const isPrivate = spaceSettings.privacy.mode === SpacePrivacyMode.PRIVATE;

    // Store the provided parent authorization so that later resets can happen
    // without having access to it.
    // Note: reset does not remove this setting.
    if (providedParentAuthorization) {
      space.authorization.parentAuthorizationPolicy =
        providedParentAuthorization;
    }

    // Warn if space does not have a valid platformRolesAccess
    if (space.platformRolesAccess.roles.length === 0) {
      throw new RelationshipNotFoundException(
        `Space ${space.id} has no platform roles access defined`,
        LogContext.AUTH
      );
    }

    // Key: what are the credentials that should be able to reach this Space, either as a top level space,
    // or subspace in public space, or members in a private space who can see subspaces there etc
    const credentialCriteriasWithAccess =
      await this.getCredentialsWithVisibilityOfSpace(space);

    // Note: later will need additional logic here for Templates
    let parentSpaceRoleSet: IRoleSet | undefined;
    switch (space.level) {
      case SpaceLevel.L0: {
        space.authorization = this.resetToPrivateLevelZeroSpaceAuthorization(
          space,
          space.authorization
        );
        break;
      }
      case SpaceLevel.L1:
      case SpaceLevel.L2: {
        if (isPrivate) {
          // Key: private get the base space authorization setup, that is then extended
          space.authorization = this.resetToPrivateLevelZeroSpaceAuthorization(
            space,
            space.authorization
          );
        } else {
          // Pick up the parent authorization
          const parentAuthorization =
            this.getParentAuthorizationPolicyOrFail(space);
          space.authorization =
            this.authorizationPolicyService.inheritParentAuthorization(
              space.authorization,
              parentAuthorization
            );
        }

        const parentSpaceCommunity = space.parentSpace?.community;
        if (!parentSpaceCommunity || !parentSpaceCommunity.roleSet) {
          throw new RelationshipNotFoundException(
            `Unable to load Space with parent RoleSet in auth reset: ${space.id} `,
            LogContext.SPACES
          );
        }
        parentSpaceRoleSet = parentSpaceCommunity.roleSet;
        break;
      }
    }

    let spaceMembershipAllowed = true;
    // Extend rules depending on the Visibility
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
      case SpaceVisibility.INACTIVE:
        space.authorization = await this.extendAuthorizationPolicyLocal(
          space.authorization,
          space.community.roleSet,
          spaceSettings,
          space.platformRolesAccess,
          credentialCriteriasWithAccess,
          parentSpaceRoleSet
        );

        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        spaceMembershipAllowed = false;
        break;
    }

    // If can READ, then can of course READ_ABOUT
    space.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        space.authorization,
        AuthorizationPrivilege.READ,
        [
          AuthorizationPrivilege.READ_ABOUT,
          AuthorizationPrivilege.READ_LICENSE,
        ],
        POLICY_RULE_READ_ABOUT
      );
    // Ensure that CREATE also allows CREATE_SUBSPACE
    space.authorization =
      this.authorizationPolicyService.appendPrivilegeAuthorizationRuleMapping(
        space.authorization,
        AuthorizationPrivilege.CREATE,
        [AuthorizationPrivilege.CREATE_SUBSPACE],
        POLICY_RULE_SPACE_CREATE_SUBSPACE
      );

    // Save before propagating to child entities
    space.authorization = await this.authorizationPolicyService.save(
      space.authorization
    );
    updatedAuthorizations.push(space.authorization);

    // Cascade down
    // propagate authorization rules for child entities
    const childAuthorizations =
      await this.propagateAuthorizationToChildEntities(
        space,
        spaceMembershipAllowed,
        credentialCriteriasWithAccess
      );
    updatedAuthorizations.push(...childAuthorizations);

    // Finally propagate to child spaces
    for (const subspace of space.subspaces) {
      const updatedSubspaceAuthorizations = await this.applyAuthorizationPolicy(
        subspace.id,
        space.authorization
      );
      this.logger.verbose?.(
        `Subspace (${subspace.id}) auth reset: saving ${updatedSubspaceAuthorizations.length} authorizations`,
        LogContext.AUTH
      );
      await this.authorizationPolicyService.saveAll(
        updatedSubspaceAuthorizations
      );
    }

    return updatedAuthorizations;
  }

  private async getCredentialsWithVisibilityOfSpace(
    space: ISpace
  ): Promise<ICredentialDefinition[]> {
    const credentialCriteriasWithAccess: ICredentialDefinition[] = [];

    // Get the platform roles access first
    const platformRolesCredentials =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        space.platformRolesAccess.roles,
        [AuthorizationPrivilege.READ_ABOUT]
      );
    credentialCriteriasWithAccess.push(...platformRolesCredentials);

    switch (space.level) {
      case SpaceLevel.L0: {
        // Always allow account admins to see the L0 spaces in their account
        const accountAdminCredential =
          this.getAccountAdminCredentialForSpaceL0OrFail(space);
        credentialCriteriasWithAccess.push(accountAdminCredential);
        break;
      }

      case SpaceLevel.L1:
        credentialCriteriasWithAccess.push(
          ...(await this.getRoleSetL1SpaceLevelCredentials(space))
        );
        break;

      case SpaceLevel.L2:
        credentialCriteriasWithAccess.push(
          ...(await this.getRoleSetL2SpaceLevelCredentials(space))
        );
        break;
    }

    // An invitee also can always have visibility
    credentialCriteriasWithAccess.push({
      type: AuthorizationCredential.SPACE_MEMBER_INVITEE,
      resourceID: space.id,
    });

    return credentialCriteriasWithAccess;
  }

  private getAccountAdminCredentialForSpaceL0OrFail(
    space: ISpace
  ): ICredentialDefinition {
    const account = space.account;
    if (!account) {
      throw new RelationshipNotFoundException(
        `Unable to load account for L0 space ${space.id} `,
        LogContext.SPACES
      );
    }
    const accountAdminCredential: ICredentialDefinition = {
      type: AuthorizationCredential.ACCOUNT_ADMIN,
      resourceID: account.id,
    };
    return accountAdminCredential;
  }

  /**
   * Determines which credentials have access for a L1 space.
   */
  private async getRoleSetL1SpaceLevelCredentials(
    space: ISpace
  ): Promise<ICredentialDefinition[]> {
    const parentSpace = space.parentSpace;
    if (!parentSpace || !parentSpace.community?.roleSet) {
      throw new EntityNotFoundException(
        `Parent space or parentSpace.community.roleSet not found for space ${space.id}`,
        LogContext.SPACES
      );
    }

    return this.roleSetService.getCredentialsForRole(
      parentSpace.community.roleSet,
      RoleName.MEMBER
    );
  }

  /**
   * Determines which credentials have access for an L2 space.
   */
  private async getRoleSetL2SpaceLevelCredentials(
    space: ISpace
  ): Promise<ICredentialDefinition[]> {
    const parentSpace = space.parentSpace;
    const parentParentSpace = parentSpace?.parentSpace;

    if (!parentSpace || !parentSpace.community || !parentParentSpace) {
      throw new EntityNotFoundException(
        `Parent spaces not found for space ${space.id}`,
        LogContext.SPACES
      );
    }

    const isParentSpacePublic =
      parentSpace.settings.privacy.mode === SpacePrivacyMode.PUBLIC;

    // - Public space, Public challenge ⇒ anyone
    // - Public space, Private challenge ⇒ challenge members
    // - Private space, Public challenge ⇒ challenge + space members
    // - Private space, Private challenge ⇒ challenge members
    if (isParentSpacePublic) {
      // ParentSpace is public, but grandparent is private ⇒ challenge members
      return await this.roleSetService.getCredentialsForRoleWithParents(
        parentSpace.community.roleSet,
        RoleName.MEMBER
      );
    } else {
      // ParentSpace is private ⇒ challenge members
      return await this.roleSetService.getCredentialsForRole(
        parentSpace.community.roleSet,
        RoleName.MEMBER
      );
    }
  }

  private getParentAuthorizationPolicyOrFail(
    space: ISpace
  ): IAuthorizationPolicy | never {
    // This will either pick up the one that was passed in or the stored reference
    const parentAuthorization = space.authorization?.parentAuthorizationPolicy;
    if (!parentAuthorization) {
      throw new RelationshipNotFoundException(
        `Space auth reset: Non L0 or private Space found without a parent Authorization set: ${space.id} `,
        LogContext.SPACES
      );
    }
    return parentAuthorization;
  }

  public async propagateAuthorizationToChildEntities(
    space: ISpace,
    spaceMembershipAllowed: boolean,
    credentialCriteriasWithAccess: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !space.authorization ||
      !space.collaboration ||
      !space.community ||
      !space.community.roleSet ||
      !space.about ||
      !space.about.profile ||
      !space.storageAggregator ||
      !space.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for space base ${space.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const isSubspaceCommunity = space.level !== SpaceLevel.L0;

    const communityAuthorizations =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        space.community.id,
        space.authorization,
        space.platformRolesAccess,
        spaceMembershipAllowed,
        space.settings,
        isSubspaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        space.storageAggregator,
        space.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        space.platformRolesAccess,
        space.community.roleSet,
        space.settings
      );
    updatedAuthorizations.push(...collaborationAuthorizations);

    const licenseAuthorizations =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        space.license,
        space.authorization
      );
    updatedAuthorizations.push(...licenseAuthorizations);

    if (space.level === SpaceLevel.L0) {
      if (!space.templatesManager) {
        // Must be a templatesManager
        throw new RelationshipNotFoundException(
          `Unable to load templatesManager on level zero space for auth reset ${space.id} `,
          LogContext.SPACES
        );
      }

      const templatesManagerAuthorizations =
        await this.templatesManagerAuthorizationService.applyAuthorizationPolicy(
          space.templatesManager.id,
          space.authorization
        );
      updatedAuthorizations.push(...templatesManagerAuthorizations);
    }

    // If can access the Space, then can READ the About
    const credentialRuleReadOnAbout =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        credentialCriteriasWithAccess,
        'Read access to About'
      );
    credentialRuleReadOnAbout.cascade = true;
    const aboutAuthorizations =
      await this.spaceAboutAuthorizationService.applyAuthorizationPolicy(
        space.about.id,
        space.authorization,
        [credentialRuleReadOnAbout]
      );
    updatedAuthorizations.push(...aboutAuthorizations);

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
    platformRolesWithAccess: IPlatformRolesAccess,
    credentialCriteriasWithAccess: ICredentialDefinition[],
    parentSpaceRoleSet: IRoleSet | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    switch (spaceSettings.privacy.mode) {
      case SpacePrivacyMode.PUBLIC: {
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ],
          credentialCriteriasWithAccess,
          'Public spaces content is visible to all'
        );
        rule.cascade = true;
        newRules.push(rule);
        break;
      }
      case SpacePrivacyMode.PRIVATE: {
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ_ABOUT],
          credentialCriteriasWithAccess,
          'Private spaces content is only visible to members'
        );
        rule.cascade = false;
        newRules.push(rule);
        break;
      }
    }

    if (parentSpaceRoleSet) {
      // Allow the parent admins to also delete subspaces
      const parentRoleSetAdminCredentials =
        await this.roleSetService.getCredentialsForRole(
          parentSpaceRoleSet,
          RoleName.ADMIN
        );

      if (parentRoleSetAdminCredentials.length !== 0) {
        const deleteSubspaces =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.DELETE],
            parentRoleSetAdminCredentials,
            CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE
          );
        deleteSubspaces.cascade = false;
        newRules.push(deleteSubspaces);
      }
    }

    const memberCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.MEMBER
    );
    const spaceMemberRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        memberCriterias,
        CREDENTIAL_RULE_SPACE_MEMBERS_READ
      );
    spaceMemberRule.cascade = true;
    newRules.push(spaceMemberRule);

    const spaceAdminCriterias: ICredentialDefinition[] = [];
    const roleSetAdminCriterias =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN
      );
    const platformRolesAdminCriterias =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        platformRolesWithAccess.roles,
        [AuthorizationPrivilege.UPDATE]
      );
    spaceAdminCriterias.push(...roleSetAdminCriterias);
    spaceAdminCriterias.push(...platformRolesAdminCriterias);

    if (spaceAdminCriterias.length > 0) {
      const spaceAdminRule =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.CREATE,
            AuthorizationPrivilege.READ,
            AuthorizationPrivilege.UPDATE,
            AuthorizationPrivilege.DELETE,
            AuthorizationPrivilege.GRANT,
          ],
          spaceAdminCriterias,
          CREDENTIAL_RULE_SPACE_ADMINS
        );
      spaceAdminRule.cascade = true;
      newRules.push(spaceAdminRule);
    }

    // Ensure privileges related to notifications are correctly assigned and also that they do not cascade
    const spaceMemberNotificationsRule =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.RECEIVE_NOTIFICATIONS],
        memberCriterias,
        'Space members receive notifications'
      );
    spaceMemberNotificationsRule.cascade = false;
    newRules.push(spaceMemberNotificationsRule);

    const leadRoleCriterias = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.LEAD
    );
    const adminNotificationCriterias =
      leadRoleCriterias.concat(spaceAdminCriterias);
    const receiveAdminNotifications =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.RECEIVE_NOTIFICATIONS_ADMIN],
        adminNotificationCriterias,
        'Space Admin receive notifications'
      );
    // Important that the receive notifications admin does not cascade
    receiveAdminNotifications.cascade = false;
    newRules.push(receiveAdminNotifications);

    const collaborationSettings = spaceSettings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubspaces) {
      const criteria = await this.getActorCriteria(roleSet, spaceSettings);
      const createSubspacePrivilegeRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
          criteria,
          CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE
        );
      createSubspacePrivilegeRule.cascade = false;
      newRules.push(createSubspacePrivilegeRule);
    }

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
  }

  private async getActorCriteria(
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<ICredentialDefinition[]> {
    const memberCriteria = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.MEMBER
    );
    const collaborationSettings = spaceSettings.collaboration;
    if (
      collaborationSettings.inheritMembershipRights &&
      spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC
    ) {
      const parentCredential =
        await this.roleSetService.getDirectParentCredentialForRole(
          roleSet,
          RoleName.MEMBER
        );
      if (parentCredential) memberCriteria.push(parentCredential);
    }
    return memberCriteria;
  }

  private resetToPrivateLevelZeroSpaceAuthorization(
    space: ISpace,
    authorizationPolicy: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    let updatedAuthorization =
      this.authorizationPolicyService.reset(authorizationPolicy);
    updatedAuthorization =
      this.platformAuthorizationService.inheritRootAuthorizationPolicy(
        updatedAuthorization
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage platform settings
    // Later: to allow account admins to some settings?
    const spacePlatformSettingsAdmin =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.PLATFORM_ADMIN],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS
      );
    spacePlatformSettingsAdmin.cascade = false;
    newRules.push(spacePlatformSettingsAdmin);

    // in order for Global roles to be able to administer the spaces
    const globalRolesReadAboutCredentials =
      this.platformRolesAccessService.getCredentialsForRolesWithAccess(
        space.platformRolesAccess.roles,
        [AuthorizationPrivilege.READ_ABOUT]
      );
    if (globalRolesReadAboutCredentials.length > 0) {
      const globalRolesReadAbout =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ_ABOUT],
          globalRolesReadAboutCredentials,
          CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS
        );
      globalRolesReadAbout.cascade = false;
      newRules.push(globalRolesReadAbout);
    }

    // Allow Global Spaces Read to view Spaces
    const privilegesForGlobalSpacesRead =
      this.platformRolesAccessService.getPrivilegesForRole(
        space.platformRolesAccess.roles,
        RoleName.GLOBAL_SPACES_READER
      );
    if (privilegesForGlobalSpacesRead.length > 0) {
      const globalSpacesReader =
        this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
          this.platformRolesAccessService.getPrivilegesForRole(
            space.platformRolesAccess.roles,
            RoleName.GLOBAL_SPACES_READER
          ),
          [AuthorizationCredential.GLOBAL_SPACES_READER],
          CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
        );
      newRules.push(globalSpacesReader);
    }

    //
    if (space.level === SpaceLevel.L0) {
      // Add the global roles can see the license information.
      const globalRolesReadLicense =
        this.platformRolesAccessService.getCredentialsForRolesWithAccess(
          space.platformRolesAccess.roles,
          [AuthorizationPrivilege.READ_LICENSE]
        );
      if (globalRolesReadLicense.length !== 0) {
        const globalRolesReadAccessLicense =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.READ_LICENSE],
            globalRolesReadLicense,
            'Read access to License for global roles'
          );
        globalRolesReadAccessLicense.cascade = false;
        newRules.push(globalRolesReadAccessLicense);
      }

      const accountAdminCredential =
        this.getAccountAdminCredentialForSpaceL0OrFail(space);
      const accountAdminReadAboutLicense =
        this.authorizationPolicyService.createCredentialRule(
          [
            AuthorizationPrivilege.READ_LICENSE,
            AuthorizationPrivilege.READ_ABOUT,
          ],
          [accountAdminCredential],
          'Read about and license access to License for account admins'
        );
      accountAdminReadAboutLicense.cascade = false;
      newRules.push(accountAdminReadAboutLicense);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }
}
