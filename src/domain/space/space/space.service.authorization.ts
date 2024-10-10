import { Injectable } from '@nestjs/common';
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
  CREDENTIAL_RULE_SUBSPACE_ADMINS,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
} from '@common/constants';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpaceLevel } from '@common/enums/space.level';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set';
import { TemplatesManagerAuthorizationService } from '@domain/template/templates-manager/templates.manager.service.authorization';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
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
    private spaceSettingsService: SpaceSettingsService
  ) {}

  async applyAuthorizationPolicy(
    spaceInput: ISpace
  ): Promise<IAuthorizationPolicy[]> {
    const space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        parentSpace: {
          authorization: true,
          community: {
            roleSet: true,
          },
        },
        agent: true,
        authorization: true,
        community: {
          roleSet: true,
        },
        collaboration: true,
        context: true,
        profile: true,
        storageAggregator: true,
        subspaces: true,
        templatesManager: true,
      },
    });
    if (
      !space.authorization ||
      !space.community ||
      !space.community.roleSet ||
      !space.subspaces
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.SPACES
      );
    }

    // Get the root space agent for licensing related logic
    const levelZeroSpaceAgent =
      await this.spaceService.getLevelZeroSpaceAgent(space);

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const spaceVisibility = space.visibility;

    // Allow the parent admins to also delete subspaces
    let parentSpaceAdminCredentialCriterias: ICredentialDefinition[] = [];
    if (space.parentSpace) {
      const parentSpaceCommunity = space.parentSpace.community;
      if (!parentSpaceCommunity || !parentSpaceCommunity.roleSet) {
        throw new RelationshipNotFoundException(
          `Unable to load Space with parent RoleSet in auth reset: ${space.id} `,
          LogContext.SPACES
        );
      }

      const spaceSettings = this.spaceSettingsService.getSettings(
        spaceInput.settingsStr
      );
      parentSpaceAdminCredentialCriterias =
        await this.roleSetService.getCredentialsForRole(
          parentSpaceCommunity.roleSet,
          CommunityRoleType.ADMIN,
          spaceSettings
        );
    }

    space.authorization = this.authorizationPolicyService.reset(
      space.authorization
    );

    const spaceSettings = this.spaceSettingsService.getSettings(
      space.settingsStr
    );
    const privateSpace =
      spaceSettings.privacy.mode === SpacePrivacyMode.PRIVATE;

    // Choose what authorization to inherit from
    let parentAuthorization: IAuthorizationPolicy | undefined;
    if (space.level === SpaceLevel.SPACE || privateSpace) {
      const accountAuthorization = await this.getAccountAuthorization(space);
      parentAuthorization = accountAuthorization;
    } else {
      if (!space.parentSpace || !space.parentSpace.authorization) {
        throw new EntityNotInitializedException(
          `Parent authorization not found on subspace auth reset: ${space.id} `,
          LogContext.SPACES
        );
      }
      parentAuthorization = space.parentSpace.authorization;
    }

    space.authorization =
      this.authorizationPolicyService.inheritParentAuthorization(
        space.authorization,
        parentAuthorization
      );

    space.authorization = await this.extendPlatformSettingsAdmin(
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
          parentSpaceAdminCredentialCriterias
        );

        //
        if (privateSpace) {
          space.authorization.anonymousReadAccess = false;
          if (space.level !== SpaceLevel.SPACE) {
            space.authorization = await this.extendPrivateSubspaceAdmins(
              space.authorization,
              space.community.roleSet,
              spaceSettings
            );
          }
        } else {
          // Public space. Inherit from parent, or if top level directly
          if (space.level === SpaceLevel.SPACE) {
            space.authorization.anonymousReadAccess = true;
          }
        }

        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        space.authorization.anonymousReadAccess = false;
        spaceMembershipAllowed = false;
        break;
    }

    // Save before proparagating to child entities
    space.authorization = await this.authorizationPolicyService.save(
      space.authorization
    );
    updatedAuthorizations.push(space.authorization);

    // Cascade down
    // propagate authorization rules for child entities
    const childAuthorzations = await this.propagateAuthorizationToChildEntities(
      space,
      levelZeroSpaceAgent,
      spaceSettings,
      spaceMembershipAllowed
    );
    updatedAuthorizations.push(...childAuthorzations);

    // Finally propagate to child spaces
    for (const subspace of space.subspaces) {
      const updatedSubspaceAuthorizations =
        await this.applyAuthorizationPolicy(subspace);
      updatedAuthorizations.push(...updatedSubspaceAuthorizations);
    }

    return updatedAuthorizations;
  }

  private async getAccountAuthorization(
    space: ISpace
  ): Promise<IAuthorizationPolicy> {
    const account =
      await this.spaceService.getAccountForLevelZeroSpaceOrFail(space);
    const accountAuthorization = account?.authorization;
    if (!accountAuthorization) {
      throw new RelationshipNotFoundException(
        `Coulnd't find authorization for space: ${space.id} `,
        LogContext.SPACES
      );
    }
    return accountAuthorization;
  }

  public async propagateAuthorizationToChildEntities(
    space: ISpace,
    levelZeroSpaceAgent: IAgent,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !space.authorization ||
      !space.agent ||
      !space.collaboration ||
      !space.community ||
      !space.community.roleSet ||
      !space.context ||
      !space.profile ||
      !space.storageAggregator
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
        levelZeroSpaceAgent,
        spaceSettings,
        spaceMembershipAllowed,
        isSubspaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        space.community.roleSet,
        spaceSettings,
        levelZeroSpaceAgent
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

    /// For fields that always should be available
    // Clone the authorization policy
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        space.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private subspaces
    clonedAuthorization.anonymousReadAccess = true;

    const profileAuthorizations =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        space.profile.id,
        clonedAuthorization
      );
    updatedAuthorizations.push(...profileAuthorizations);

    const contextAuthorizations =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        space.context,
        clonedAuthorization
      );
    updatedAuthorizations.push(...contextAuthorizations);

    return updatedAuthorizations;
  }

  private extendPrivilegeRuleCreateSubspace(
    authorization: IAuthorizationPolicy
  ): IAuthorizationPolicy {
    // Ensure that CREATE also allows CREATE_CHALLENGE
    const createSubspacePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.CREATE_SUBSPACE],
      AuthorizationPrivilege.CREATE,
      POLICY_RULE_SPACE_CREATE_SUBSPACE
    );
    this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      [createSubspacePrivilege]
    );

    return authorization;
  }

  private async extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings,
    deletionCredentialCriterias: ICredentialDefinition[]
  ): Promise<IAuthorizationPolicy> {
    this.extendPrivilegeRuleCreateSubspace(authorization);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (deletionCredentialCriterias.length !== 0) {
      const deleteSubspaces =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.DELETE],
          deletionCredentialCriterias,
          CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE
        );
      deleteSubspaces.cascade = false;
      newRules.push(deleteSubspaces);
    }

    const memberCriteras = await this.roleSetService.getCredentialsForRole(
      roleSet,
      CommunityRoleType.MEMBER,
      spaceSettings
    );
    const spaceMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      memberCriteras,
      CREDENTIAL_RULE_SPACE_MEMBERS_READ
    );
    newRules.push(spaceMember);

    const spaceAdminCriterias = await this.roleSetService.getCredentialsForRole(
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

  private async extendPrivateSubspaceAdmins(
    authorization: IAuthorizationPolicy | undefined,
    roleSet: IRoleSet,
    spaceSettings: ISpaceSettings
  ): Promise<IAuthorizationPolicy> {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(roleSet)}`,
        LogContext.SPACES
      );
    const rules: IAuthorizationPolicyRuleCredential[] = [];
    const credentials =
      await this.roleSetService.getCredentialsForRoleWithParents(
        roleSet,
        CommunityRoleType.ADMIN,
        spaceSettings
      );

    const spaceAdminCriteria = [...credentials];
    const subspaceSpaceAdmins =
      this.authorizationPolicyService.createCredentialRule(
        [
          AuthorizationPrivilege.CREATE,
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.GRANT,
          AuthorizationPrivilege.DELETE,
        ],
        spaceAdminCriteria,
        CREDENTIAL_RULE_SUBSPACE_ADMINS
      );
    rules.push(subspaceSpaceAdmins);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      rules
    );

    return authorization;
  }

  private async extendPlatformSettingsAdmin(
    authorization: IAuthorizationPolicy | undefined
  ): Promise<IAuthorizationPolicy> {
    if (!authorization) {
      throw new EntityNotInitializedException(
        'Authorization definition not found for account',
        LogContext.ACCOUNT
      );
    }

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    // Allow global admins to manage platform settings
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

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }
}
