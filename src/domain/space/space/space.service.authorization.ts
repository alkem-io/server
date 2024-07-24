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
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY,
  CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN,
  CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER,
  CREDENTIAL_RULE_SUBSPACE_ADMINS,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED,
  CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN,
  CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE,
  CREDENTIAL_RULE_TYPES_SPACE_PLATFORM_SETTINGS,
} from '@common/constants';
import { CommunityMembershipPolicy } from '@common/enums/community.membership.policy';
import { EntityNotInitializedException } from '@common/exceptions';
import { IAuthorizationPolicyRuleCredential } from '@core/authorization/authorization.policy.rule.credential.interface';
import { AuthorizationPolicyRulePrivilege } from '@core/authorization/authorization.policy.rule.privilege';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpaceLevel } from '@common/enums/space.level';
import { AgentAuthorizationService } from '@domain/agent/agent/agent.service.authorization';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { ISpaceSettings } from '../space.settings/space.settings.interface';

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
    private spaceService: SpaceService,
    private spaceSettingsService: SpaceSettingsService
  ) {}

  async applyAuthorizationPolicy(spaceInput: ISpace): Promise<ISpace> {
    const spaceAccountLicense = await this.spaceService.getSpaceOrFail(
      spaceInput.id,
      {
        relations: {
          parentSpace: {
            community: {
              policy: true,
            },
          },
          account: {
            license: true,
            agent: {
              credentials: true,
            },
          },
        },
      }
    );
    if (
      !spaceAccountLicense.account ||
      !spaceAccountLicense.account.license ||
      !spaceAccountLicense.account.agent ||
      !spaceAccountLicense.account.agent.credentials
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${spaceAccountLicense.id} `,
        LogContext.SPACES
      );
    }

    const spaceVisibility = spaceAccountLicense.account.license.visibility;
    const accountAgent = spaceAccountLicense.account.agent;

    // Allow the parent admins to also delete subspaces
    let deletionCredentialCriterias: ICredentialDefinition[] = [];
    if (spaceAccountLicense.parentSpace) {
      if (
        !spaceAccountLicense.parentSpace.community ||
        !spaceAccountLicense.parentSpace.community.policy
      ) {
        throw new RelationshipNotFoundException(
          `Unable to load Space with parent community policy in auth reset: ${spaceAccountLicense.id} `,
          LogContext.SPACES
        );
      }

      const parentCommunityPolicyWithSettings = this.getCommunityPolicy(
        spaceAccountLicense.parentSpace
      );
      const spaceSettings = this.spaceSettingsService.getSettings(
        spaceInput.settingsStr
      );
      deletionCredentialCriterias =
        this.communityPolicyService.getCredentialsForRole(
          parentCommunityPolicyWithSettings,
          spaceSettings,
          CommunityRole.ADMIN
        );
    }

    let space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        authorization: true,
        community: {
          policy: true,
        },
        parentSpace: {
          authorization: true,
        },
        agent: true,
        collaboration: true,
        context: true,
        profile: true,
        storageAggregator: true,
      },
    });
    if (
      !space.authorization ||
      !space.community ||
      !space.community.policy ||
      !space.account.authorization
    )
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.SPACES
      );

    space.authorization = this.authorizationPolicyService.reset(
      space.authorization
    );

    const communityPolicy = this.getCommunityPolicy(space);
    const spaceSettings = this.spaceSettingsService.getSettings(
      space.settingsStr
    );
    const privateSpace =
      spaceSettings.privacy.mode === SpacePrivacyMode.PRIVATE;
    const accountAuthorization = space.account.authorization;

    // Choose what authorization to inherit from
    let parentAuthorization = accountAuthorization;
    if (space.level === SpaceLevel.SPACE) {
      parentAuthorization = accountAuthorization;
    } else if (privateSpace) {
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

    if (privateSpace) {
      space.authorization.anonymousReadAccess = false;
    }

    if (!space.authorization) {
      throw new RelationshipNotFoundException(
        `Unable authorization not set on Space: ${space.id} `,
        LogContext.SPACES
      );
    }
    // Extend rules depending on the Visibility
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.authorization = this.extendAuthorizationPolicyLocal(
          space.authorization,
          communityPolicy,
          spaceSettings,
          space,
          deletionCredentialCriterias
        );
        if (privateSpace && space.level !== SpaceLevel.SPACE) {
          space.authorization = this.extendPrivateSubspaceAdmins(
            space.authorization,
            communityPolicy,
            spaceSettings
          );
        }
        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        space.authorization.anonymousReadAccess = false;
        break;
    }

    // Save before proparagating to child entities
    space = await this.spaceService.save(space);

    // Cascade down
    // propagate authorization rules for child entities
    space = await this.propagateAuthorizationToChildEntities(
      space,
      accountAgent,
      communityPolicy,
      spaceSettings
    );

    if (!space.community)
      throw new RelationshipNotFoundException(
        `Unable to load Community on space after child entities propagation: ${space.id} `,
        LogContext.SPACES
      );

    // Finally update the child entities that depend on license
    // directly after propagation
    switch (spaceVisibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.community.authorization =
          this.extendCommunityAuthorizationPolicySpace(
            space.community.authorization,
            communityPolicy,
            spaceSettings
          );
        break;
      case SpaceVisibility.ARCHIVED:
        break;
    }

    // Save with all child entities updated with exception of subspaces as they need to look after their own saving
    space = await this.spaceService.save(space);

    space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        subspaces: true,
      },
    });
    if (!space.subspaces) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with subspaces at part of auth reset: ${spaceAccountLicense.id} `,
        LogContext.SPACES
      );
    }

    // Finally propagate to child spaces
    // NOTE: each space will look after saving itself
    for (const subspace of space.subspaces) {
      await this.applyAuthorizationPolicy(subspace);
    }

    return space;
  }

  public async propagateAuthorizationToChildEntities(
    space: ISpace,
    accountAgent: IAgent,
    communityPolicy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): Promise<ISpace> {
    if (
      !space.agent ||
      !space.collaboration ||
      !space.community ||
      !space.community.policy ||
      !space.context ||
      !space.profile ||
      !space.storageAggregator
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities on auth reset for space base ${space.id} `,
        LogContext.SPACES
      );
    }

    // Clone the authorization policy
    const clonedAuthorization =
      this.authorizationPolicyService.cloneAuthorizationPolicy(
        space.authorization
      );
    // To ensure that profile + context on a space are always publicly visible, even for private subspaces
    clonedAuthorization.anonymousReadAccess = true;

    space.community =
      await this.communityAuthorizationService.applyAuthorizationPolicy(
        space.community,
        space.authorization,
        accountAgent,
        communityPolicy,
        spaceSettings
      );

    // Subspaces to allow some membership options based on the parent space recential
    if (space.level !== SpaceLevel.SPACE) {
      // Allow directly adding members at subspace level
      space.community.authorization =
        this.extendCommunityAuthorizationPolicySubspace(
          space.community.authorization,
          communityPolicy,
          spaceSettings
        );
    }

    space.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        communityPolicy,
        spaceSettings,
        accountAgent
      );

    space.agent = this.agentAuthorizationService.applyAuthorizationPolicy(
      space.agent,
      space.authorization
    );

    space.profile =
      await this.profileAuthorizationService.applyAuthorizationPolicy(
        space.profile,
        clonedAuthorization
      );

    space.context =
      await this.contextAuthorizationService.applyAuthorizationPolicy(
        space.context,
        clonedAuthorization
      );

    space.storageAggregator =
      await this.storageAggregatorAuthorizationService.applyAuthorizationPolicy(
        space.storageAggregator,
        space.authorization
      );

    return space;
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

  public extendAuthorizationPolicyLocal(
    authorization: IAuthorizationPolicy,
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings,
    space: ISpace,
    deletionCredentialCriterias: ICredentialDefinition[]
  ): IAuthorizationPolicy {
    this.extendPrivilegeRuleCreateSubspace(authorization);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (spaceSettings.privacy.mode === SpacePrivacyMode.PRIVATE) {
      authorization.anonymousReadAccess = false;
    }

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
    // Note: this only works for User account hosts
    if (space.level === SpaceLevel.SPACE) {
      spaceAdminCriterias.push({
        type: AuthorizationCredential.ACCOUNT_HOST,
        resourceID: space.account.id,
      });
    }
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

  private extendCommunityAuthorizationPolicySubspace(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!authorization)
      throw new EntityNotInitializedException(
        'Authorization definition not found',
        LogContext.SPACES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const parentCommunityCredential =
      this.communityPolicyService.getDirectParentCredentialForRole(
        policy,
        CommunityRole.MEMBER
      );

    // Allow member of the parent community to Apply
    if (parentCommunityCredential) {
      const membershipSettings = spaceSettings.membership;
      switch (membershipSettings.policy) {
        case CommunityMembershipPolicy.APPLICATIONS:
          const spaceMemberCanApply =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_APPLY],
              [parentCommunityCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_APPLY
            );
          spaceMemberCanApply.cascade = false;
          newRules.push(spaceMemberCanApply);
          break;
        case CommunityMembershipPolicy.OPEN:
          const spaceMemberCanJoin =
            this.authorizationPolicyService.createCredentialRule(
              [AuthorizationPrivilege.COMMUNITY_JOIN],
              [parentCommunityCredential],
              CREDENTIAL_RULE_SUBSPACE_PARENT_MEMBER_JOIN
            );
          spaceMemberCanJoin.cascade = false;
          newRules.push(spaceMemberCanJoin);
          break;
      }
    }

    const adminCredentials =
      this.communityPolicyService.getCredentialsForRoleWithParents(
        policy,
        spaceSettings,
        CommunityRole.ADMIN
      );

    const addMembers = this.authorizationPolicyService.createCredentialRule(
      [AuthorizationPrivilege.COMMUNITY_ADD_MEMBER],
      adminCredentials,
      CREDENTIAL_RULE_COMMUNITY_ADD_MEMBER
    );
    addMembers.cascade = false;
    newRules.push(addMembers);

    this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );

    return authorization;
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

  private extendCommunityAuthorizationPolicySpace(
    communityAuthorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy,
    spaceSettings: ISpaceSettings
  ): IAuthorizationPolicy {
    if (!communityAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.SPACES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const membershipPolicy = spaceSettings.membership.policy;
    switch (membershipPolicy) {
      case CommunityMembershipPolicy.APPLICATIONS:
        const anyUserCanApply =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.COMMUNITY_APPLY],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_APPLY_GLOBAL_REGISTERED
          );
        anyUserCanApply.cascade = false;
        newRules.push(anyUserCanApply);
        break;
      case CommunityMembershipPolicy.OPEN:
        const anyUserCanJoin =
          this.authorizationPolicyService.createCredentialRuleUsingTypesOnly(
            [AuthorizationPrivilege.COMMUNITY_JOIN],
            [AuthorizationCredential.GLOBAL_REGISTERED],
            CREDENTIAL_RULE_TYPES_SPACE_COMMUNITY_JOIN_GLOBAL_REGISTERED
          );
        anyUserCanJoin.cascade = false;
        newRules.push(anyUserCanJoin);
        break;
    }

    // Associates of trusted organizations can join
    const trustedOrganizationIDs: string[] = [];
    for (const trustedOrganizationID of trustedOrganizationIDs) {
      const hostOrgMembersCanJoin =
        this.authorizationPolicyService.createCredentialRule(
          [AuthorizationPrivilege.COMMUNITY_JOIN],
          [
            {
              type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
              resourceID: trustedOrganizationID,
            },
          ],
          CREDENTIAL_RULE_SPACE_HOST_ASSOCIATES_JOIN
        );
      hostOrgMembersCanJoin.cascade = false;
      newRules.push(hostOrgMembersCanJoin);
    }

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      communityAuthorization,
      newRules
    );
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
}
