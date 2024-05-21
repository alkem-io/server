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
import { ILicense } from '@domain/license/license/license.interface';
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
  POLICY_RULE_COMMUNITY_INVITE,
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
    let space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        authorization: true,
        community: {
          policy: true,
        },
        account: {
          license: true,
          authorization: true,
        },
        parentSpace: {
          authorization: true,
        },
      },
    });
    if (
      !space.authorization ||
      !space.community ||
      !space.community.policy ||
      !space.account ||
      !space.account.license ||
      !space.account.authorization
    )
      throw new RelationshipNotFoundException(
        `Unable to load Space with entities at start of auth reset: ${space.id} `,
        LogContext.SPACES
      );

    space.authorization = this.authorizationPolicyService.reset(
      space.authorization
    );
    const communityPolicyWithFlags = this.getCommunityPolicyWithSettings(space);

    const license = space.account.license;
    const privateSpace =
      space.community.policy.settings.privacy.mode === SpacePrivacyMode.PRIVATE;
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
    switch (license.visibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.authorization = this.extendAuthorizationPolicyLocal(
          space.authorization,
          communityPolicyWithFlags
        );
        if (privateSpace && space.level !== SpaceLevel.SPACE) {
          space.authorization = this.extendPrivateSubspaceAdmins(
            space.authorization,
            communityPolicyWithFlags
          );
        }
        break;
      case SpaceVisibility.ARCHIVED:
        // ensure it has visibility privilege set to private
        space.authorization.anonymousReadAccess = false;
        break;
    }

    await this.spaceService.save(space);

    // Cascade down
    // propagate authorization rules for child entities
    const spacePropagated = await this.propagateAuthorizationToChildEntities(
      space,
      license
    );
    space.subspaces = await this.propagateAuthorizationToSubspaces(
      spacePropagated,
      communityPolicyWithFlags
    );

    // Reload, to get all the saves from save above + with
    // key entities loaded that are needed for next steps
    space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        community: true,
      },
    });
    if (!space.community)
      throw new RelationshipNotFoundException(
        `Unable to load Space after first save: ${space.id} `,
        LogContext.SPACES
      );

    // Finally update the child entities that depend on license
    // directly after propagation
    switch (license.visibility) {
      case SpaceVisibility.ACTIVE:
      case SpaceVisibility.DEMO:
        space.community.authorization =
          this.extendCommunityAuthorizationPolicySpace(
            space.community.authorization,
            communityPolicyWithFlags
          );
        break;
      case SpaceVisibility.ARCHIVED:
        break;
    }

    return await this.spaceService.save(space);
  }

  public async propagateAuthorizationToChildEntities(
    spaceInput: ISpace,
    license: ILicense
  ): Promise<ISpace> {
    const space = await this.spaceService.getSpaceOrFail(spaceInput.id, {
      relations: {
        account: {
          license: true,
        },
        agent: true,
        collaboration: true,
        community: {
          policy: true,
        },
        context: true,
        profile: true,
        storageAggregator: true,
      },
    });
    if (
      !space.account ||
      !space.account.license ||
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
    const communityPolicy = this.getCommunityPolicyWithSettings(space);

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
        license,
        communityPolicy
      );

    // Invitations are only supported at root space level, so have different authorizations
    // depending on the level
    if (space.level === SpaceLevel.SPACE) {
      // Only allow invitations for root spaces
      space.community.authorization = this.extendPrivilegeRulesInviteMember(
        space.community.authorization
      );
    } else {
      // Allow directly adding members at subspace level
      space.community.authorization =
        this.extendCommunityAuthorizationPolicySubspace(
          space.community.authorization,
          communityPolicy
        );
    }

    space.collaboration =
      await this.collaborationAuthorizationService.applyAuthorizationPolicy(
        space.collaboration,
        space.authorization,
        communityPolicy,
        license
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
    return await this.spaceService.save(space);
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
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    this.extendPrivilegeRuleCreateSubspace(authorization);

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    if (policy.settings.privacy.mode === SpacePrivacyMode.PRIVATE) {
      authorization.anonymousReadAccess = false;
    }

    const memberCriteras = this.communityPolicyService.getCredentialsForRole(
      policy,
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

    const collaborationSettings = policy.settings.collaboration;
    if (collaborationSettings.allowMembersToCreateSubspaces) {
      const criteria = this.getContributorCriteria(policy);
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

  public getCommunityPolicyWithSettings(spaceInput: ISpace): ICommunityPolicy {
    if (!spaceInput.community?.policy)
      throw new EntityNotInitializedException(
        `Unable to load community policy on base space: ${spaceInput.id}`,
        LogContext.SPACES
      );

    const spaceSettings = this.spaceSettingsService.getSettings(
      spaceInput.settingsStr
    );
    const communityPolicyWithFlags = spaceInput.community.policy;
    communityPolicyWithFlags.settings = spaceSettings;
    return communityPolicyWithFlags;
  }

  private extendPrivilegeRulesInviteMember(
    authorization: IAuthorizationPolicy | undefined
  ): IAuthorizationPolicy {
    const privilegeRules: AuthorizationPolicyRulePrivilege[] = [];

    const communityInvitePrivilege = new AuthorizationPolicyRulePrivilege(
      [AuthorizationPrivilege.COMMUNITY_INVITE],
      AuthorizationPrivilege.GRANT,
      POLICY_RULE_COMMUNITY_INVITE
    );
    privilegeRules.push(communityInvitePrivilege);

    return this.authorizationPolicyService.appendPrivilegeAuthorizationRules(
      authorization,
      privilegeRules
    );
  }

  private extendCommunityAuthorizationPolicySubspace(
    authorization: IAuthorizationPolicy | undefined,
    policy: ICommunityPolicy
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
      const membershipSettings = policy.settings.membership;
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
    policy: ICommunityPolicy
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
    policy: ICommunityPolicy
  ): IAuthorizationPolicy {
    if (!communityAuthorization)
      throw new EntityNotInitializedException(
        `Authorization definition not found for: ${JSON.stringify(policy)}`,
        LogContext.SPACES
      );

    const newRules: IAuthorizationPolicyRuleCredential[] = [];

    const membershipPolicy = policy.settings.membership.policy;
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

  public extendSubSpaceAuthorization(
    authorization: IAuthorizationPolicy | undefined,
    credentialCriterias: ICredentialDefinition[]
  ): IAuthorizationPolicy {
    const newRules: IAuthorizationPolicyRuleCredential[] = [];
    const deleteSubspaces =
      this.authorizationPolicyService.createCredentialRule(
        [AuthorizationPrivilege.DELETE],
        credentialCriterias,
        CREDENTIAL_RULE_SPACE_ADMIN_DELETE_SUBSPACE
      );
    deleteSubspaces.cascade = false;
    newRules.push(deleteSubspaces);

    return this.authorizationPolicyService.appendCredentialAuthorizationRules(
      authorization,
      newRules
    );
  }

  private getContributorCriteria(
    policy: ICommunityPolicy
  ): ICredentialDefinition[] {
    const memberCriteria = this.communityPolicyService.getCredentialsForRole(
      policy,
      CommunityRole.MEMBER
    );
    const collaborationSettings = policy.settings.collaboration;
    if (
      collaborationSettings.inheritMembershipRights &&
      policy.settings.privacy.mode === SpacePrivacyMode.PUBLIC
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

  private async propagateAuthorizationToSubspaces(
    spaceBase: ISpace,
    communityPolicy: ICommunityPolicy
  ): Promise<ISpace[]> {
    const space = await this.spaceService.getSpaceOrFail(spaceBase.id, {
      relations: {
        subspaces: true,
      },
    });

    if (!space.subspaces)
      throw new RelationshipNotFoundException(
        `Unable to load subspaces for space ${space.id} `,
        LogContext.SPACES
      );

    const spaceAdminCriteria =
      await this.communityPolicyService.getCredentialsForRole(
        communityPolicy,
        CommunityRole.ADMIN
      );
    const updatedSpaces: ISpace[] = [];
    for (const subspace of space.subspaces) {
      const updatedSubspace = await this.applyAuthorizationPolicy(subspace);

      updatedSubspace.authorization = this.extendSubSpaceAuthorization(
        subspace.authorization,
        spaceAdminCriteria
      );
      updatedSpaces.push(updatedSubspace);
    }
    return updatedSpaces;
  }
}
