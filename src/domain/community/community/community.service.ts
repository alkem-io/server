import {
  CreateApplicationInput,
  IApplication,
} from '@domain/community/application';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  InvalidStateTransitionException,
  ValidationException,
  CommunityPolicyRoleLimitsException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IUser } from '@domain/community/user';
import { CreateUserGroupInput } from '@domain/community/user-group/dto';
import { Community, ICommunity } from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICommunication } from '@domain/communication/communication';
import { LogContext } from '@common/enums/logging.context';
import { CommunityType } from '@common/enums/community.type';
import { OrganizationService } from '../organization/organization.service';
import { IOrganization } from '../organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CommunityRole } from '@common/enums/community.role';
import { CommunityContributorsUpdateType } from '@common/enums/community.contributors.update.type';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ICommunityRolePolicy } from '../community-policy/community.policy.role.interface';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { AgentInfo } from '@core/authentication';
import { CommunityPolicyService } from '../community-policy/community.policy.service';
import { ICommunityPolicyDefinition } from '../community-policy/community.policy.type';

@Injectable()
export class CommunityService {
  constructor(
    private activityAdapter: ActivityAdapter,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private userGroupService: UserGroupService,
    private applicationService: ApplicationService,
    private communicationService: CommunicationService,
    private communityPolicyService: CommunityPolicyService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    name: string,
    hubID: string,
    type: CommunityType,
    policy: ICommunityPolicyDefinition
  ): Promise<ICommunity> {
    const community: ICommunity = new Community(name, type);
    community.authorization = new AuthorizationPolicy();
    community.policy = await this.communityPolicyService.createCommunityPolicy(
      policy.member,
      policy.lead
    );
    community.hubID = hubID;

    community.groups = [];
    community.communication =
      await this.communicationService.createCommunication(
        community.displayName,
        hubID
      );
    return await this.communityRepository.save(community);
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const communityID = groupData.parentID;
    const groupName = groupData.name;

    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to Community (${communityID})`,
      LogContext.COMMUNITY
    );

    // Try to find the Community
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['groups'],
    });

    const group = await this.userGroupService.addGroupWithName(
      community,
      groupName,
      community.hubID
    );
    await this.communityRepository.save(community);

    return group;
  }

  // Loads the group into the Community entity if not already present
  async getUserGroups(community: ICommunity): Promise<IUserGroup[]> {
    const communityWithGroups = await this.getCommunityOrFail(community.id, {
      relations: ['groups'],
    });
    if (!communityWithGroups.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGroups.groups;
  }

  async getCommunityOrFail(
    communityID: string,
    options?: FindOneOptions<Community>
  ): Promise<ICommunity> {
    const community = await this.communityRepository.findOne(
      { id: communityID },
      options
    );
    if (!community)
      throw new EntityNotFoundException(
        `Unable to find Community with ID: ${communityID}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  async removeCommunity(communityID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['applications', 'groups', 'communication'],
    });

    // Remove all groups
    if (community.groups) {
      for (const group of community.groups) {
        await this.userGroupService.removeUserGroup({
          ID: group.id,
        });
      }
    }

    // Remove all issued role credentials for contributors
    for (const role of Object.values(CommunityRole)) {
      const users = await this.getUsersWithRole(community, role);
      for (const user of users) {
        await this.removeUserFromRole(community, user.id, role);
      }

      const organizations = await this.getOrganizationsWithRole(
        community,
        role
      );
      for (const organization of organizations) {
        await this.removeOrganizationFromRole(community, organization.id, role);
      }
    }

    if (community.authorization)
      await this.authorizationPolicyService.delete(community.authorization);

    // Remove all applications
    if (community.applications) {
      for (const application of community.applications) {
        await this.applicationService.deleteApplication({
          ID: application.id,
        });
      }
    }

    if (community.communication) {
      await this.communicationService.removeCommunication(
        community.communication.id
      );
    }

    if (community.policy) {
      await this.communityPolicyService.removeCommunityPolicy(community.policy);
    }

    await this.communityRepository.remove(community as Community);
    return true;
  }

  async save(community: ICommunity): Promise<ICommunity> {
    return await this.communityRepository.save(community);
  }

  async getParentCommunity(
    community: ICommunity
  ): Promise<ICommunity | undefined> {
    const communityWithParent = await this.getCommunityOrFail(community.id, {
      relations: ['parentCommunity'],
    });

    const parentCommunity = communityWithParent?.parentCommunity;
    if (parentCommunity) {
      return await this.getCommunityOrFail(parentCommunity.id);
    }
    return undefined;
  }

  async setParentCommunity(
    community?: ICommunity,
    parentCommunity?: ICommunity
  ): Promise<ICommunity> {
    if (!community || !parentCommunity)
      throw new EntityNotInitializedException(
        'Community not set',
        LogContext.COMMUNITY
      );
    community.parentCommunity = parentCommunity;
    // Also update the communityPolicy
    community.policy =
      await this.communityPolicyService.inheritParentCredentials(
        this.getCommunityPolicy(parentCommunity),
        this.getCommunityPolicy(community)
      );
    return await this.communityRepository.save(community);
  }

  async getUsersWithRole(
    community: ICommunity,
    role: CommunityRole
  ): Promise<IUser[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
    );
    return await this.userService.usersWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async getOrganizationsWithRole(
    community: ICommunity,
    role: CommunityRole
  ): Promise<IOrganization[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
    );
    return await this.organizationService.organizationsWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async countContributorsPerRole(
    community: ICommunity,
    role: CommunityRole,
    contributorType: CommunityContributorType
  ): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
    );

    if (contributorType === CommunityContributorType.ORGANIZATION) {
      return await this.organizationService.countOrganizationsWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    if (contributorType === CommunityContributorType.USER) {
      return await this.userService.countUsersWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    return 0;
  }

  getCredentialDefinitionForRole(
    community: ICommunity,
    role: CommunityRole
  ): CredentialDefinition {
    const policyRole = this.getCommunityPolicyForRole(community, role);
    return policyRole.credential;
  }

  async assignUserToRole(
    community: ICommunity,
    userID: string,
    role: CommunityRole,
    agentInfo?: AgentInfo
  ): Promise<ICommunity> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);
    const hasMemberRoleInParent = await this.isMemberInParentCommunity(
      agent,
      community.id
    );
    if (!hasMemberRoleInParent) {
      throw new ValidationException(
        `Agent (${agent.id}) is not a member of parent community: ${community.displayName}`,
        LogContext.CHALLENGES
      );
    }

    user.agent = await this.assignContributorToRole(
      community,
      agent,
      role,
      CommunityContributorType.USER
    );

    if (role === CommunityRole.MEMBER) {
      this.addMemberToCommunication(user, community);
      let triggeredUserID = userID;
      if (agentInfo) {
        triggeredUserID = agentInfo.userID;
      }
      const activityLogInput: ActivityInputMemberJoined = {
        triggeredBy: triggeredUserID,
        community: community,
        user: user,
      };
      await this.activityAdapter.memberJoined(activityLogInput);
    }

    return community;
  }

  private async addMemberToCommunication(
    user: IUser,
    community: ICommunity
  ): Promise<void> {
    // register the user for the community rooms
    const communication = await this.getCommunication(community.id);
    this.communicationService
      .addUserToCommunications(communication, user.communicationID)
      .catch(error =>
        this.logger.error?.(
          `Unable to add user to community messaging (${community.displayName}): ${error}`,
          LogContext.COMMUNICATION
        )
      );
  }

  private async isMemberInParentCommunity(
    agent: IAgent,
    communityID: string
  ): Promise<boolean> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['parentCommunity'],
    });

    // If the parent community is set, then check if the user is also a member there
    if (community.parentCommunity) {
      const isParentMember = await this.isMember(
        agent,
        community.parentCommunity.id
      );
      return isParentMember;
    }
    return true;
  }

  private async grantCommunityRole(
    agent: IAgent,
    roleCredential: CredentialDefinition
  ): Promise<IAgent> {
    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  getCommunityPolicy(community: ICommunity): ICommunityPolicy {
    const policy = community.policy;
    if (!policy) {
      throw new EntityNotInitializedException(
        `Unable to locate policy for community: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return policy;
  }

  async getCommunication(communityID: string): Promise<ICommunication> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['communication'],
    });

    const communication = community.communication;
    if (!communication) {
      throw new EntityNotInitializedException(
        `Unable to locate communication for community: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return communication;
  }

  async assignOrganizationToRole(
    community: ICommunity,
    organizationID: string,
    role: CommunityRole
  ): Promise<ICommunity> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.assignContributorToRole(
      community,
      agent,
      role,
      CommunityContributorType.ORGANIZATION
    );

    return community;
  }

  async removeUserFromRole(
    community: ICommunity,
    userID: string,
    role: CommunityRole
  ): Promise<ICommunity> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);

    user.agent = await this.removeContributorFromRole(
      community,
      agent,
      role,
      CommunityContributorType.USER
    );

    if (role === CommunityRole.MEMBER) {
      const communication = await this.getCommunication(community.id);
      this.communicationService
        .removeUserFromCommunications(communication, user)
        .catch(error =>
          this.logger.error?.(
            `Unable to add remove user from community messaging (${community.displayName}): ${error}`,
            LogContext.COMMUNICATION
          )
        );
    }

    return community;
  }

  async removeOrganizationFromRole(
    community: ICommunity,
    organizationID: string,
    role: CommunityRole
  ): Promise<ICommunity> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.removeContributorFromRole(
      community,
      agent,
      role,
      CommunityContributorType.ORGANIZATION
    );

    return community;
  }

  private async validateUserCommunityPolicy(
    community: ICommunity,
    communityPolicyRole: ICommunityRolePolicy,
    role: CommunityRole,
    action: CommunityContributorsUpdateType
  ) {
    const userMembersCount = await this.countContributorsPerRole(
      community,
      role,
      CommunityContributorType.USER
    );

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (userMembersCount === communityPolicyRole.maxUser) {
        throw new CommunityPolicyRoleLimitsException(
          `Max limit of users reached for role '${role}': ${communityPolicyRole.maxUser}, cannot assign new user.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (userMembersCount === communityPolicyRole.minUser) {
        throw new CommunityPolicyRoleLimitsException(
          `Min limit of users reached for role '${role}': ${communityPolicyRole.minUser}, cannot remove user.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateOrganizationCommunityPolicy(
    community: ICommunity,
    communityPolicyRole: ICommunityRolePolicy,
    role: CommunityRole,
    action: CommunityContributorsUpdateType
  ) {
    const orgMemberCount = await this.countContributorsPerRole(
      community,
      role,
      CommunityContributorType.ORGANIZATION
    );

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (orgMemberCount === communityPolicyRole.maxOrg) {
        throw new CommunityPolicyRoleLimitsException(
          `Max limit of organizations reached for role '${role}': ${communityPolicyRole.maxOrg}, cannot assign new organization.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (orgMemberCount === communityPolicyRole.minOrg) {
        throw new CommunityPolicyRoleLimitsException(
          `Min limit of organizations reached for role '${role}': ${communityPolicyRole.minOrg}, cannot remove organization.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateCommunityPolicyLimits(
    community: ICommunity,
    communityPolicyRole: ICommunityRolePolicy,
    role: CommunityRole,
    action: CommunityContributorsUpdateType,
    contributorType: CommunityContributorType
  ) {
    if (contributorType === CommunityContributorType.USER)
      await this.validateUserCommunityPolicy(
        community,
        communityPolicyRole,
        role,
        action
      );

    if (contributorType === CommunityContributorType.ORGANIZATION)
      await this.validateOrganizationCommunityPolicy(
        community,
        communityPolicyRole,
        role,
        action
      );
  }

  private async assignContributorToRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRole,
    contributorType: CommunityContributorType
  ): Promise<IAgent> {
    const communityPolicyRole = this.getCommunityPolicyForRole(community, role);
    await this.validateCommunityPolicyLimits(
      community,
      communityPolicyRole,
      role,
      CommunityContributorsUpdateType.ASSIGN,
      contributorType
    );

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: communityPolicyRole.credential.type,
      resourceID: communityPolicyRole.credential.resourceID,
    });
  }

  private async removeContributorFromRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRole,
    contributorType: CommunityContributorType
  ): Promise<IAgent> {
    const communityPolicyRole = this.getCommunityPolicyForRole(community, role);
    await this.validateCommunityPolicyLimits(
      community,
      communityPolicyRole,
      role,
      CommunityContributorsUpdateType.REMOVE,
      contributorType
    );

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: communityPolicyRole.credential.type,
      resourceID: communityPolicyRole.credential.resourceID,
    });
  }

  private getCommunityPolicyForRole(
    community: ICommunity,
    role: CommunityRole
  ): ICommunityRolePolicy {
    const policy = this.getCommunityPolicy(community);
    return this.communityPolicyService.getCommunityRolePolicy(policy, role);
  }

  async updateCommunityPolicyResourceID(
    community: ICommunity,
    resourceID: string
  ): Promise<ICommunityPolicy> {
    const policy = this.getCommunityPolicy(community);
    return await this.communityPolicyService.updateCommunityPolicyResourceID(
      policy,
      resourceID
    );
  }

  async isMember(agent: IAgent, communityID: string): Promise<boolean> {
    const community = await this.getCommunityOrFail(communityID);
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRole.MEMBER
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async getCommunities(hubId: string): Promise<Community[]> {
    const communites = await this.communityRepository.find({
      where: { hub: { id: hubId } },
    });
    return communites || [];
  }

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const { user, agent } = await this.userService.getUserAndAgent(
      applicationData.userID
    );
    const community = (await this.getCommunityOrFail(applicationData.parentID, {
      relations: ['applications', 'parentCommunity'],
    })) as Community;

    // Check presence / status of existing applications
    const existingApplications =
      await this.applicationService.findExistingApplications(
        user.id,
        community.id
      );
    for (const existingApplication of existingApplications) {
      const isApplicationFinalized =
        await this.applicationService.isFinalizedApplication(
          existingApplication.id
        );
      if (!isApplicationFinalized) {
        throw new InvalidStateTransitionException(
          `An application (ID: ${existingApplication.id}) already exists for user ${existingApplication.user?.email} on Community: ${community.displayName} that is not finalized.`,
          LogContext.COMMUNITY
        );
      }
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, community.id);
    if (isExistingMember)
      throw new InvalidStateTransitionException(
        `User ${applicationData.userID} is already a member of the Community: ${community.displayName}.`,
        LogContext.COMMUNITY
      );

    const hubID = community.hubID;
    if (!hubID)
      throw new EntityNotInitializedException(
        `Unable to locate containing hub: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    const application = await this.applicationService.createApplication(
      applicationData,
      hubID
    );
    community.applications?.push(application);
    await this.communityRepository.save(community);

    return application;
  }

  async getCommunityInNameableScopeOrFail(
    communityID: string,
    nameableScopeID: string
  ): Promise<ICommunity> {
    const community = await this.communityRepository.findOne({
      id: communityID,
      hubID: nameableScopeID,
    });

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community with ID: ${communityID}`,
        LogContext.COMMUNITY
      );
    }

    return community;
  }

  async getApplications(community: ICommunity): Promise<IApplication[]> {
    const communityApps = await this.getCommunityOrFail(community.id, {
      relations: ['applications'],
    });
    return communityApps?.applications || [];
  }

  async getMembersCount(community: ICommunity): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRole.MEMBER
    );

    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });

    return credentialMatches;
  }

  async getLeadsCount(community: ICommunity): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRole.LEAD
    );

    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });

    return credentialMatches;
  }

  async isHubCommunity(community: ICommunity): Promise<boolean> {
    const parentCommunity = await this.getParentCommunity(community);

    return parentCommunity === undefined;
  }
}
