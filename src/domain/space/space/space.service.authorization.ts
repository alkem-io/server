import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  AuthorizationCredential,
  AuthorizationPrivilege,
  LogContext,
} from '@common/enums';
import { SpaceService } from './space.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ISpace } from './space.interface';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { RoleName } from '@common/enums/role.name';
import {
  POLICY_RULE_SPACE_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
  POLICY_RULE_READ_ABOUT,
} from '@common/constants';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { SpaceLevel } from '@common/enums/space.level';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';
import { LicenseAuthorizationService } from '@domain/common/license/license.service.authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { EntityNotFoundException } from '@common/exceptions';
import { SpaceAboutAuthorizationService } from '../space.about/space.about.service.authorization';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private roleSetService: RoleSetService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private templatesManagerAuthorizationService: TemplatesManagerAuthorizationService,
    private spaceAboutAuthorizationService: SpaceAboutAuthorizationService,
    private spaceService: SpaceService,
    private licenseAuthorizationService: LicenseAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async applyAuthorizationPolicy(
    spaceID: string,
    providedParentAuthorization?: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy[]> {
    const space = await this.spaceService.getSpaceOrFail(spaceID, {
      relations: {
        authorization: {
          parentAuthorizationPolicy: true,
        },
        parentSpace: {
          community: {
            roleSet: true,
          },
          parentSpace: true,
        },
        agent: true,
        community: {
          roleSet: true,
        },
        collaboration: true,
        about: {
          profile: true,
        },
        storageAggregator: true,
        subspaces: true,
        templatesManager: true,
        license: true,
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

    // Key: what are the credentials that should be able to reach this Space, either as a top level space,
    // or subspace in public space, or members in a private space who can see subspaces there etc
    const credentialCriteriasWithAccess =
      await this.getCredentialsWithVisibilityOfSpace(space);

    // Note: later will need additional logic here for Templates
    let parentSpaceRoleSet: IRoleSet | undefined;
    switch (space.level) {
      case SpaceLevel.L0: {
        space.authorization = this.resetToPrivateLevelZeroSpaceAuthorization(
          space.authorization
        );
        break;
      }
      case SpaceLevel.L1:
      case SpaceLevel.L2: {
        if (isPrivate) {
          // Key: private get the base space authorization setup, that is then extended
          space.authorization = this.resetToPrivateLevelZeroSpaceAuthorization(
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
        space.authorization = await this.extendAuthorizationPolicyLocal(
          space.authorization,
          space.community.roleSet,
          spaceSettings,
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
        [AuthorizationPrivilege.READ_ABOUT],
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
        spaceSettings,
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
    const globalAnonymousRegistered =
      this.authorizationPolicyService.getCredentialDefinitionsAnonymousRegistered();

    switch (space.level) {
      case SpaceLevel.L0:
        credentialCriteriasWithAccess.push(...globalAnonymousRegistered);
        break;

      case SpaceLevel.L1:
        credentialCriteriasWithAccess.push(
          ...(await this.getL1SpaceLevelCredentials(
            space,
            globalAnonymousRegistered
          ))
        );
        break;

      case SpaceLevel.L2:
        credentialCriteriasWithAccess.push(
          ...(await this.getL2SpaceLevelCredentials(
            space,
            globalAnonymousRegistered
          ))
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

  /**
   * Determines which credentials have access for a L1 space.
   */
  private async getL1SpaceLevelCredentials(
    space: ISpace,
    globalAnonymousRegistered: ICredentialDefinition[]
  ): Promise<ICredentialDefinition[]> {
    const parentSpace = space.parentSpace;
    if (!parentSpace || !parentSpace.community?.roleSet) {
      throw new EntityNotFoundException(
        `Parent space or parentSpace.community.roleSet not found for space ${space.id}`,
        LogContext.SPACES
      );
    }

    const isParentSpacePublic =
      parentSpace.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
    if (isParentSpacePublic) {
      // If the parent space is PUBLIC, allow anonymous/registered.
      return globalAnonymousRegistered;
    } else {
      // Otherwise, return the parent space’s MEMBER credentials.
      return this.roleSetService.getCredentialsForRole(
        parentSpace.community.roleSet,
        RoleName.MEMBER,
        parentSpace.settings
      );
    }
  }

  /**
   * Determines which credentials have access for an L2 space.
   */
  private async getL2SpaceLevelCredentials(
    space: ISpace,
    globalAnonymousRegistered: ICredentialDefinition[]
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
    const isGrandparentSpacePublic =
      parentParentSpace.settings.privacy.mode === SpacePrivacyMode.PUBLIC;

    // - Public space, Public challenge ⇒ anyone
    // - Public space, Private challenge ⇒ challenge members
    // - Private space, Public challenge ⇒ challenge + space members
    // - Private space, Private challenge ⇒ challenge members
    if (isParentSpacePublic) {
      if (isGrandparentSpacePublic) {
        // ParentSpace is public, grandparent (the top-level space) is also public
        return globalAnonymousRegistered;
      } else {
        // ParentSpace is public, but grandparent is private ⇒ challenge members
        return this.roleSetService.getCredentialsForRoleWithParents(
          parentSpace.community.roleSet,
          RoleName.MEMBER,
          parentSpace.settings
        );
      }
    } else {
      // ParentSpace is private ⇒ challenge members
      return this.roleSetService.getCredentialsForRole(
        parentSpace.community.roleSet,
        RoleName.MEMBER,
        parentSpace.settings
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
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean,
    credentialCriteriasWithAccess: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !space.authorization ||
      !space.agent ||
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
        spaceSettings,
        spaceMembershipAllowed,
        isSubspaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const agentAuthorization =
      this.agentAuthorizationService.applyAuthorizationPolicy(
        space.agent,
        space.authorization
      );
    updatedAuthorizations.push(agentAuthorization);

    const storageAuthorizations =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        space.storageAggregator,
        space.authorization
      );
    updatedAuthorizations.push(...storageAuthorizations);

    // Level zero space only entities
    if (space.level === SpaceLevel.L0) {
      if (!space.templatesManager) {
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

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        space.community.roleSet,
        spaceSettings
      );
    updatedAuthorizations.push(...collaborationAuthorizations);

    const licenseAuthorizations =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        space.license,
        space.authorization
      );
    updatedAuthorizations.push(...licenseAuthorizations);

    // And the children that may be read about
    const spaceAboutExtraCredentialRules: IAuthorizationPolicyRuleCredential[] =
      [];
    switch (spaceSettings.privacy.mode) {
      // Also for PUBLIC spaces cascade the read on About to avoid having privilege rules everywhere
      case SpacePrivacyMode.PUBLIC:
      case SpacePrivacyMode.PRIVATE:
        const credentialRuleReadOnAbout =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.READ],
            credentialCriteriasWithAccess,
            'Read access to About'
          );
        credentialRuleReadOnAbout.cascade = true;
        spaceAboutExtraCredentialRules.push(credentialRuleReadOnAbout);
        break;
    }
    const aboutAuthorizations =
      await this.spaceAboutAuthorizationService.applyAuthorizationPolicy(
        space.about,
        space.authorization,
        spaceAboutExtraCredentialRules
      );
    updatedAuthorizations.push(...aboutAuthorizations);

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
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
      case SpacePrivacyMode.PRIVATE:
        const rule = this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.READ_ABOUT],
          credentialCriteriasWithAccess,
          'Private spaces content is only visible to members'
        );
        rule.cascade = false;
        newRules.push(rule);
        break;
    }

    if (parentSpaceRoleSet) {
      // Allow the parent admins to also delete subspaces
      const parentRoleSetAdminCredentials =
        await this.roleSetService.getCredentialsForRole(
          parentSpaceRoleSet,
          RoleName.ADMIN,
          spaceSettings
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
      RoleName.MEMBER,
      spaceSettings
    );
    const spaceMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      memberCriterias,
      CREDENTIAL_RULE_SPACE_MEMBERS_READ
    );
    newRules.push(spaceMember);

    const spaceAdminCriterias =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        RoleName.ADMIN,
        spaceSettings
      );
    const spaceAdmin = this.authorizationPolicyService.createCredentialRule(
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
    newRules.push(spaceAdmin);

    const collaborationSettings = spaceSettings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubspaces) {
      const criteria = await this.getContributorCriteria(
        roleSet,
        spaceSettings
      );
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

  private async getContributorCriteria(
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<ICredentialDefinition[]> {
    const memberCriteria = await this.roleSetService.getCredentialsForRole(
      roleSet,
      RoleName.MEMBER,
      spaceSettings
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
    const platformSettings =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [
          AuthorizationPrivilege.PLATFORM_ADMIN,
          AuthorizationPrivilege.READ_ABOUT, // in order for Global Support to be able to administer the spaces
        ],
        [
          AuthorizationCredential.GLOBAL_ADMIN,
          AuthorizationCredential.GLOBAL_SUPPORT,
        ],
        CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS
      );
    platformSettings.cascade = false;
    newRules.push(platformSettings);

    // Allow Global Spaces Read to view Spaces
    const globalSpacesReader =
      this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
        [AuthorizationPrivilege.READ],
        [AuthorizationCredential.GLOBAL_SPACES_READER],
        CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ
      );
    newRules.push(globalSpacesReader);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      updatedAuthorization,
      newRules
    );
  }
}
