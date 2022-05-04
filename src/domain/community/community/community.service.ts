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
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IUser } from '@domain/community/user';
import { CreateUserGroupInput } from '@domain/community/user-group/dto';
import {
  Community,
  ICommunity,
  AssignCommunityMemberUserInput,
  RemoveCommunityMemberUserInput,
} from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { ICredential } from '@domain/agent/credential';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICommunication } from '@domain/communication/communication';
import { LogContext } from '@common/enums/logging.context';
import { CommunityType } from '@common/enums/community.type';
import { CommunityPolicy } from './community.policy';
import { OrganizationService } from '../organization/organization.service';
import { IOrganization } from '../organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { AssignCommunityMemberOrganizationInput } from './dto/community.dto.assign.member.organization';
import { RemoveCommunityMemberOrganizationInput } from './dto/community.dto.remove.member.organization';
import { RemoveCommunityLeadOrganizationInput } from './dto/community.dto.remove.lead.organization';
import { AssignCommunityLeadOrganizationInput } from './dto/community.dto.assign.lead.organization';

@Injectable()
export class CommunityService {
  private defaultCommunityPolicy = {
    minOrg: 0,
    maxOrg: 9,
    minUser: 0,
    maxUser: 2,
  };

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private userGroupService: UserGroupService,
    private applicationService: ApplicationService,
    private communicationService: CommunicationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    name: string,
    hubID: string,
    type: CommunityType
  ): Promise<ICommunity> {
    const community: ICommunity = new Community(name, type);
    community.authorization = new AuthorizationPolicy();
    community.hubID = hubID;

    community.groups = [];
    community.communication =
      await this.communicationService.createCommunication(
        community.displayName,
        hubID
      );

    this.setCommunityPolicy(community, this.defaultCommunityPolicy);
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
      relations: [
        'applications',
        'groups',
        'communication',
        'membershipCredential',
        'leadershipCredential',
      ],
    });

    // Remove all groups
    if (community.groups) {
      for (const group of community.groups) {
        await this.userGroupService.removeUserGroup({
          ID: group.id,
        });
      }
    }

    // Remove all issued membership credentials
    const members = await this.getUserMembers(community);
    for (const member of members) {
      await this.removeMemberUser({
        userID: member.id,
        communityID: community.id,
      });
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

    await this.communityRepository.remove(community as Community);
    return true;
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

  getCommunityPolicy(community: ICommunity): CommunityPolicy | undefined {
    if (community.policy) {
      const policy = JSON.parse(community.policy);
      return policy;
    }
    return undefined;
  }

  setCommunityPolicy(
    community: ICommunity,
    policy: CommunityPolicy
  ): ICommunity {
    community.policy = JSON.stringify(policy);
    return community;
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
    await this.communityRepository.save(community);
    return community;
  }

  async getUserMembers(community: ICommunity): Promise<IUser[]> {
    const membershipCredential = this.getMembershipCredential(community);
    return await this.userService.usersWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async getOrganizationMembers(
    community: ICommunity
  ): Promise<IOrganization[]> {
    const membershipCredential = this.getMembershipCredential(community);
    return await this.organizationService.organizationsWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async assignMemberUser(
    membershipData: AssignCommunityMemberUserInput
  ): Promise<ICommunity> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );
    user.agent = await this.assignMemberContributor(
      agent,
      membershipData.communityID
    );

    // register the user for the community rooms
    const communication = await this.getCommunication(
      membershipData.communityID
    );
    this.communicationService
      .addUserToCommunications(communication, user.communicationID)
      .catch(error =>
        this.logger.error?.(
          `Unable to add user to community messaging (${membershipData.communityID}): ${error}`,
          LogContext.COMMUNICATION
        )
      );

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  async assignMemberOrganization(
    membershipData: AssignCommunityMemberOrganizationInput
  ): Promise<ICommunity> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );
    organization.agent = await this.assignMemberContributor(
      agent,
      membershipData.communityID
    );

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  private async assignMemberContributor(
    agent: IAgent,
    communityID: string
  ): Promise<IAgent> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['parentCommunity'],
    });

    const membershipCredential = this.getMembershipCredential(community);

    // If the parent community is set, then check if the user is also a member there
    if (community.parentCommunity) {
      const isParentMember = await this.isMember(
        agent,
        community.parentCommunity.id
      );
      if (!isParentMember)
        throw new ValidationException(
          `Agent (${agent.id}) is not a member of parent community: ${community.parentCommunity.displayName}`,
          LogContext.CHALLENGES
        );
    }

    // Assign a credential for community membership
    return await this.grantCommunityRole(agent, membershipCredential);
  }

  async assignLeadOrganization(
    membershipData: AssignCommunityLeadOrganizationInput
  ): Promise<ICommunity> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );
    organization.agent = await this.assignLeadContributor(
      agent,
      membershipData.communityID
    );

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  private async assignLeadContributor(
    agent: IAgent,
    communityID: string
  ): Promise<IAgent> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['parentCommunity'],
    });

    const leadershipCredential = this.getLeadershipCredential(community);

    return await this.grantCommunityRole(agent, leadershipCredential);
  }

  async grantCommunityRole(
    agent: IAgent,
    roleCredential: ICredential
  ): Promise<IAgent> {
    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
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

  getMembershipCredential(community: ICommunity): ICredential {
    const credential = community.membershipCredential;
    if (!credential) {
      throw new EntityNotInitializedException(
        `Unable to locate credential type for community: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return credential;
  }

  getLeadershipCredential(community: ICommunity): ICredential {
    const credential = community.leadershipCredential;
    if (!credential) {
      throw new EntityNotInitializedException(
        `Unable to locate leadership credential for community: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return credential;
  }

  async removeMemberUser(
    membershipData: RemoveCommunityMemberUserInput
  ): Promise<ICommunity> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.removeMemberContributor(
      agent,
      membershipData.communityID
    );

    const community = await this.getCommunityOrFail(membershipData.communityID);
    const membershipCredential = this.getMembershipCredential(community);
    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });

    const communication = await this.getCommunication(community.id);
    this.communicationService
      .removeUserFromCommunications(communication, user)
      .catch(error =>
        this.logger.error?.(
          `Unable to add remove user from community messaging (${community.displayName}): ${error}`,
          LogContext.COMMUNICATION
        )
      );

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  async removeMemberOrganization(
    membershipData: RemoveCommunityMemberOrganizationInput
  ): Promise<ICommunity> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );

    organization.agent = await this.removeMemberContributor(
      agent,
      membershipData.communityID
    );

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  private async removeMemberContributor(
    agent: IAgent,
    communityID: string
  ): Promise<IAgent> {
    const community = await this.getCommunityOrFail(communityID);
    const membershipCredential = this.getMembershipCredential(community);
    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async removeLeadOrganization(
    membershipData: RemoveCommunityLeadOrganizationInput
  ): Promise<ICommunity> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(
        membershipData.organizationID
      );

    organization.agent = await this.removeLeadContributor(
      agent,
      membershipData.communityID
    );

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  private async removeLeadContributor(
    agent: IAgent,
    communityID: string
  ): Promise<IAgent> {
    const community = await this.getCommunityOrFail(communityID);
    const leadershipCredential = this.getLeadershipCredential(community);
    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: leadershipCredential.type,
      resourceID: leadershipCredential.resourceID,
    });
  }

  async isMember(agent: IAgent, communityID: string): Promise<boolean> {
    const community = await this.getCommunityOrFail(communityID);
    const membershipCredential = this.getMembershipCredential(community);

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
    const membershipCredential = this.getMembershipCredential(community);

    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    // Need to reduce by one to take into account that the community itself also holds a credential as reference
    return credentialMatches - 1;
  }
}
