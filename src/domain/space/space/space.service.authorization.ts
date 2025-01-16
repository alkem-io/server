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
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityRoleType } from '@common/enums/community.role';
import {
  POLICY_RULE_SPACE_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ,
  CREDENTIAL_RULE_SPACE_ADMINS,
  CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
  CREDENTIAL_RULE_TYPES_GLOBAL_SPACE_READ,
  POLICY_RULE_READ_ABOUT,
  CREDENTIAL_RULE_SPACE_MEMBERS_READ_ABOUT_SUBSPACES,
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

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private roleSetService: RoleSetService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private templatesManagerAuthorizationService: TemplatesManagerAuthorizationService,
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
        context: true,
        profile: true,
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

    const credentialCriteriasWithAccessToSpace =
      await this.getCredentialCriteriasWithAccessToSpace(space);

    // Note: later will need additional logic here for Templates
    let parentSpaceRoleSet: IRoleSet | undefined;
    switch (space.level) {
      case SpaceLevel.SPACE: {
        space.authorization = this.resetToPrivateLevelZeroSpaceAuthorization(
          space.authorization
        );
        break;
      }
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY: {
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

        // For subspace, the parent space admins credentials should be allowed to delete
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

    space.authorization = this.appendCredentialRuleSpaceVisibility(
      credentialCriteriasWithAccessToSpace,
      isPrivate,
      space.authorization
    );

    let spaceMembershipAllowed = true;
    // Extend rules depending on the Visibility
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.authorization = await this.extendAuthorizationPolicyLocal(
          space.authorization,
          space.community.roleSet,
          spaceSettings,
          parentSpaceRoleSet
        );

        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to priva
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
    // Ensure that CREATE also allows CREATE_CHALLENGE
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
        parentSpaceRoleSet,
        credentialCriteriasWithAccessToSpace,
        isPrivate
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

  private async getCredentialCriteriasWithAccessToSpace(
    space: ISpace
  ): Promise<ICredentialDefinition[]> {
    const credentialCriteriasWithAccess: ICredentialDefinition[] = [];
    const credentialCriteriasAnonymousRegistered: ICredentialDefinition[] = [
      {
        type: AuthorizationCredential.GLOBAL_ANONYMOUS,
        resourceID: '',
      },
      {
        type: AuthorizationCredential.GLOBAL_REGISTERED,
        resourceID: '',
      },
    ];
    switch (space.level) {
      case SpaceLevel.SPACE: {
        credentialCriteriasWithAccess.push(
          ...credentialCriteriasAnonymousRegistered
        );
        break;
      }
      case SpaceLevel.CHALLENGE: {
        const parentSpace = space.parentSpace;
        if (!parentSpace || !parentSpace.community?.roleSet) {
          throw new EntityNotFoundException(
            ` Parent spaces not found for space ${space.id}`,
            LogContext.SPACES
          );
        }
        const isParentSpacePublic =
          space.parentSpace?.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
        if (isParentSpacePublic) {
          credentialCriteriasWithAccess.push(
            ...credentialCriteriasAnonymousRegistered
          );
        } else {
          // get the member criterias for the parent space and add it
          const parentMembersCriterias =
            await this.roleSetService.getCredentialsForRole(
              parentSpace.community?.roleSet,
              CommunityRoleType.MEMBER,
              parentSpace.settings
            );
          credentialCriteriasWithAccess.push(...parentMembersCriterias);
        }
        break;
      }
      case SpaceLevel.OPPORTUNITY: {
        // Space Challenge	Opportunity
        // Public space, Public challenge ==>	anyone
        // Public	space, Private challenge ==> challenge members
        // Private space,	Public challenge ==> challenge + space members
        // Private space,Private challenge ==> challenge members
        const parentSpace = space.parentSpace;
        const parentParentSpace = parentSpace?.parentSpace;
        if (!parentSpace || !parentSpace.community || !parentParentSpace) {
          throw new EntityNotFoundException(
            ` Parent spaces not found for space ${space.id}`,
            LogContext.SPACES
          );
        }
        const isParentSpacePublic =
          parentSpace.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
        const isParentParentSpacePublic =
          parentParentSpace.settings.privacy.mode === SpacePrivacyMode.PUBLIC;
        if (isParentSpacePublic) {
          if (isParentParentSpacePublic) {
            credentialCriteriasWithAccess.push(
              ...credentialCriteriasAnonymousRegistered
            );
          } else {
            const parentMembersCriterias =
              await this.roleSetService.getCredentialsForRoleWithParents(
                parentSpace.community?.roleSet,
                CommunityRoleType.MEMBER,
                parentSpace.settings
              );
            credentialCriteriasWithAccess.push(...parentMembersCriterias);
          }
        } else {
          const parentMembersCriterias =
            await this.roleSetService.getCredentialsForRole(
              parentSpace.community?.roleSet,
              CommunityRoleType.MEMBER,
              parentSpace.settings
            );
          credentialCriteriasWithAccess.push(...parentMembersCriterias);
        }

        break;
      }
    }
    return credentialCriteriasWithAccess;
  }

  private createCredentialRuleSpaceVisibility(
    credentialCriterias: ICredentialDefinition[],
    isPrivate: boolean
  ): IAuthorizationPolicyRuleCredential {
    if (isPrivate) {
      const newRule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ_ABOUT],
        credentialCriterias,
        'Space visibility private'
      );
      return newRule;
    } else {
      const newRule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        credentialCriterias,
        'Space visibility public'
      );
      return newRule;
    }
  }

  private createCredentialRuleSpaceCollaborationVisibility(
    credentialCriterias: ICredentialDefinition[],
    isPrivate: boolean
  ): IAuthorizationPolicyRuleCredential | undefined {
    if (!isPrivate) {
      const newRule = this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.READ],
        credentialCriterias,
        'Space visibility public'
      );
      return newRule;
    }
  }

  private appendCredentialRuleSpaceVisibility(
    credentialCriterias: ICredentialDefinition[],
    isPrivate: boolean,
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    const auth =
      this.authorizationPolicyService.validateAuthorization(authorization);
    const credentialRule = this.createCredentialRuleSpaceVisibility(
      credentialCriterias,
      isPrivate
    );
    credentialRule.cascade = false;
    auth.credentialRules.push(credentialRule);
    return auth;
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
    parentSpaceRoleSet: IRoleSet | undefined,
    credentialCriteriasWithAccessToSpace: ICredentialDefinition[],
    isPrivate: boolean
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !space.authorization ||
      !space.agent ||
      !space.collaboration ||
      !space.community ||
      !space.community.roleSet ||
      !space.context ||
      !space.profile ||
      !space.storageAggregator ||
      !space.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for space base ${space.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const isSubspaceCommunity = space.level !== SpaceLevel.SPACE;

    const communityAuthorizations =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        space.community.id,
        space.authorization,
        spaceSettings,
        spaceMembershipAllowed,
        isSubspaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const credentialRuleAccessSpaceCollaboration =
      this.createCredentialRuleSpaceCollaborationVisibility(
        credentialCriteriasWithAccessToSpace,
        isPrivate
      );

    if (credentialRuleAccessSpaceCollaboration)
      credentialRuleAccessSpaceCollaboration.cascade = true;

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        space.community.roleSet,
        spaceSettings,
        credentialRuleAccessSpaceCollaboration
          ? [credentialRuleAccessSpaceCollaboration]
          : []
      );
    updatedAuthorizations.push(...collaborationAuthorizations);

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

    const licenseAuthorizations =
      this.licenseAuthorizationService.applyAuthorizationPolicy(
        space.license,
        space.authorization
      );
    updatedAuthorizations.push(...licenseAuthorizations);

    // Level zero space only entities
    if (space.level === SpaceLevel.SPACE) {
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

    /// For fields that should either be either always readable for about
    let clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        space.authorization
      );
    switch (space.level) {
      case SpaceLevel.SPACE: {
        clonedAuthorization =
          this.authorizationPolicyService.appendCredentialRuleAnonymousRegisteredAccess(
            clonedAuthorization,
            AuthorizationPrivilege.READ
          );
        break;
      }
      case SpaceLevel.CHALLENGE:
      case SpaceLevel.OPPORTUNITY: {
        if (!parentSpaceRoleSet) {
          throw new RelationshipNotFoundException(
            `Subspace found without parent RoleSet in auth reset: ${space.id} `,
            LogContext.SPACES
          );
        }
        const parentRoleSetMemberCredentials =
          await this.roleSetService.getCredentialsForRoleWithParents(
            parentSpaceRoleSet,
            CommunityRoleType.MEMBER,
            spaceSettings
          );
        const readAboutSubspaces =
          this.authorizationPolicyService.createCredentialRule(
            [AuthorizationPrivilege.READ_ABOUT],
            parentRoleSetMemberCredentials,
            CREDENTIAL_RULE_SPACE_MEMBERS_READ_ABOUT_SUBSPACES
          );
        readAboutSubspaces.cascade = true; // means whole tree under context + profile have READ_ABOUT
        clonedAuthorization =
          this.authorizationPolicyService.appendCredentialAuthorizationRules(
            clonedAuthorization,
            [readAboutSubspaces]
          );
        break;
      }
    }

    const credentialRuleAccessSpaceContextProfile =
      this.createCredentialRuleSpaceVisibility(
        credentialCriteriasWithAccessToSpace,
        isPrivate
      );
    credentialRuleAccessSpaceContextProfile.cascade = true;

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        space.profile.id,
        clonedAuthorization,
        [credentialRuleAccessSpaceContextProfile]
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const contextAuthorizations =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        space.context,
        clonedAuthorization,
        [credentialRuleAccessSpaceContextProfile]
      );
    updatedAuthorizations.push(...contextAuthorizations);

    return updatedAuthorizations;
  }

  private async extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
    parentSpaceRoleSet: IRoleSet | undefined
  ): Promise<IAuthorizationPolicy> {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (parentSpaceRoleSet) {
      // Allow the parent admins to also delete subspaces
      const parentRoleSetAdminCredentials =
        await this.roleSetService.getCredentialsForRole(
          parentSpaceRoleSet,
          CommunityRoleType.ADMIN,
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
      CommunityRoleType.MEMBER,
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
        CommunityRoleType.ADMIN,
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
      const createSubspacePrilegeRule =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.CREATE_SUBSPACE],
          criteria,
          CREDENTIAL_RULE_MEMBER_CREATE_SUBSPACE
        );
      createSubspacePrilegeRule.cascade = false;
      newRules.push(createSubspacePrilegeRule);
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
      CommunityRoleType.MEMBER,
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
          CommunityRoleType.MEMBER
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
        [AuthorizationPrivilege.PLATFORM_ADMIN],
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
