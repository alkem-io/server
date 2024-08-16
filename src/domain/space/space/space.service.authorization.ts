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
import { CommunityPolicyService } from '@domain/community/community-policy/community.policy.service';
import { CommunityAuthorizationService } from '@domain/community/community/community.service.authorization';
import { StorageAggregatorAuthorizationService } from '@domain/storage/storage-aggregator/storage.aggregator.service.authorization';
import { ProfileAuthorizationService } from '@domain/common/profile/profile.service.authorization';
import { CollaborationAuthorizationService } from '@domain/collaboration/collaboration/collaboration.service.authorization';
import { ContextAuthorizationService } from '@domain/context/context/context.service.authorization';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { CommunityRole } from '@common/enums/community.role';
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
import { TemplatesSetAuthorizationService } from '@domain/template/templates-set/templates.set.service.authorization';

@Injectable()
export class SpaceAuthorizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentAuthorizationService: AgentAuthorizationService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorAuthorizationService: StorageAggregatorAuthorizationService,
    private profileAuthorizationService: ProfileAuthorizationService,
    private contextAuthorizationService: ContextAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private collaborationAuthorizationService: CollaborationAuthorizationService,
    private templatesSetAuthorizationService: TemplatesSetAuthorizationService,
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
            policy: true,
          },
        },
        account: {
          agent: {
            credentials: true,
          },
        },
        authorization: true,
        community: {
          policy: true,
        },
        agent: true,
        collaboration: true,
        context: true,
        profile: true,
        storageAggregator: true,
        subspaces: true,
        library: true,
        defaults: true,
      },
    });
    if (
      !space.account ||
      !space.account.authorization ||
      !space.account.agent ||
      !space.account.agent.credentials ||
      !space.authorization ||
      !space.community ||
      !space.community.policy ||
      !space.subspaces ||
      !space.library ||
      !space.defaults
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.SPACES
      );
    }

    const updatedAuthorizations: IAuthorizationPolicy[] = [];

    const spaceVisibility = space.visibility;
    const accountAgent = space.account.agent;

    // Allow the parent admins to also delete subspaces
    let parentSpaceAdminCredentialCriterias: ICredentialDefinition[] = [];
    if (space.parentSpace) {
      if (!space.parentSpace.community || !space.parentSpace.community.policy) {
        throw new RelationshipNotFoundException(
          `Unable to load Space with parent community policy in auth reset: ${space.id} `,
          LogContext.SPACES
        );
      }

      const parentCommunityPolicyWithSettings = this.getCommunityPolicy(
        space.parentSpace
      );
      const spaceSettings = this.spaceSettingsService.getSettings(
        spaceInput.settingsStr
      );
      parentSpaceAdminCredentialCriterias =
        this.communityPolicyService.getCredentialsForRole(
          parentCommunityPolicyWithSettings,
          spaceSettings,
          CommunityRole.ADMIN
        );
    }

    space.authorization = this.authorizationPolicyService.reset(
      space.authorization
    );

    const communityPolicy = this.getCommunityPolicy(space);
    const spaceSettings = this.spaceSettingsService.getSettings(
      space.settingsStr
    );
    const privateSpace =
      spaceSettings.privacy.mode === SpacePrivacyMode.PRIVATE;
    const accountAuthorization = space?.account?.authorization;

    // Choose what authorization to inherit from
    let parentAuthorization: IAuthorizationPolicy | undefined;
    if (space.level === SpaceLevel.SPACE) {
      if (!accountAuthorization) {
        throw new RelationshipNotFoundException(
          `Coulnd't find account for Level0 space: ${space.id} `,
          LogContext.SPACES
        );
      }
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
        space.authorization = this.extendAuthorizationPolicyLocal(
          space.authorization,
          communityPolicy,
          spaceSettings,
          space,
          parentSpaceAdminCredentialCriterias
        );

        //
        if (privateSpace) {
          space.authorization.anonymousReadAccess = false;
          if (space.level !== SpaceLevel.SPACE) {
            space.authorization = this.extendPrivateSubspaceAdmins(
              space.authorization,
              communityPolicy,
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
      accountAgent,
      communityPolicy,
      spaceSettings,
      spaceMembershipAllowed
    );
    updatedAuthorizations.push(...childAuthorzations);

    // Finally propagate to child spaces
    for (const subspace of space.subspaces) {
      const updatedSubspaceAuthorizations =
        await this.applyAuthorizationPolicy(subspace);
      updatedSubspaceAuthorizations.push(...updatedSubspaceAuthorizations);
    }

    return updatedAuthorizations;
  }

  public async propagateAuthorizationToChildEntities(
    space: ISpace,
    accountAgent: IAgent,
    communityPolicy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    spaceMembershipAllowed: boolean
  ): Promise<IAuthorizationPolicy[]> {
    if (
      !space.authorization ||
      !space.agent ||
      !space.collaboration ||
      !space.community ||
      !space.community.policy ||
      !space.context ||
      !space.profile ||
      !space.library ||
      !space.defaults ||
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
        space.community,
        space.authorization,
        accountAgent,
        communityPolicy,
        spaceSettings,
        spaceMembershipAllowed,
        isSubspaceCommunity
      );
    updatedAuthorizations.push(...communityAuthorizations);

    const collaborationAuthorizations =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        communityPolicy,
        spaceSettings,
        accountAgent
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

    const libraryAuthorizations =
      await this.templatesSetAuthorizationService.applyAuthorizationPolicy(
        space.library,
        space.authorization
      );
    updatedAuthorizations.push(...libraryAuthorizations);

    const defaultsAuthorizations =
      await this.authorizationPolicyService.inheritParentAuthorization(
        space.defaults.authorization,
        space.authorization
      );
    updatedAuthorizations.push(defaultsAuthorizations);

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
        space.profile,
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

  private extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    space: ISpace,
    deletionCredentialCriterias: ICredentialDefinition[]
  ): IAuthorizationPolicy {
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

    const memberCriteras = this.communityPolicyService.getCredentialsForRole(
      policy,
      spaceSettings,
      CommunityRole.MEMBER
    );
    const spaceMember = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.READ],
      memberCriteras,
      CREDENTIAL_RULE_SPACE_MEMBERS_READ
    );
    newRules.push(spaceMember);

    const spaceAdminCriterias =
      this.communityPolicyService.getCredentialsForRole(
        policy,
        spaceSettings,
        CommunityRole.ADMIN
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
      const criteria = this.getContributorCriteria(policy, spaceSettings);
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

  public getCommunityPolicy(spaceInput: ISpace): ICommunityPolicy {
    if (!spaceInput.community?.policy)
      throw new EntityNotInitializedException(
        `Unable to load community policy on base space: ${spaceInput.id}`,
        LogContext.SPACES
      );

    const communityPolicyWithFlags = spaceInput.community.policy;
    return communityPolicyWithFlags;
  }

  private getContributorCriteria(
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): ICredentialDefinition[] {
    const memberCriteria = this.communityPolicyService.getCredentialsForRole(
      policy,
      spaceSettings,
      CommunityRole.MEMBER
    );
    const collaborationSettings = spaceSettings.collaboration;
    if (
      collaborationSettings.inheritMembershipRights &&
      spaceSettings.privacy.mode === SpacePrivacyMode.PUBLIC
    ) {
      const parentCredential =
        this.communityPolicyService.getDirectParentCredentialForRole(
          policy,
          CommunityRole.MEMBER
        );
      if (parentCredential) memberCriteria.push(parentCredential);
    }
    return memberCriteria;
  }

  private extendPrivateSubspaceAdmins(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.SPACES
      );
    const rules: IAuthorizationPolicyRuleCredential[] = [];

    const spaceAdminCriteria = [
      ...this.communityPolicyService.getCredentialsForRoleWithParents(
        policy,
        spaceSettings,
        CommunityRole.ADMIN
      ),
    ];
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
