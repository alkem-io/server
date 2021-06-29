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
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { IUser } from '@domain/community/user';
import { CreateUserGroupInput } from '@domain/community/user-group';
import {
  Community,
  ICommunity,
  AssignCommunityMemberInput,
  RemoveCommunityMemberInput,
} from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationDefinition } from '@domain/common/authorization-definition';
import { ICredential } from '@domain/agent/credential';
import { AuthorizationDefinitionService } from '@domain/common/authorization-definition/authorization.definition.service';
import { CommunicationService } from '@services/platform/communication/communication.service';
import { CommunicationRoomDetailsResult } from '@services/platform/communication/communication.dto.room.result';

@Injectable()
export class CommunityService {
  constructor(
    private authorizationDefinitionService: AuthorizationDefinitionService,
    private agentService: AgentService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private applicationService: ApplicationService,
    private communicationService: CommunicationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(name: string): Promise<ICommunity> {
    const community = new Community(name);
    community.authorization = new AuthorizationDefinition();

    community.groups = [];
    // save to get an id assigned
    await this.communityRepository.save(community);

    return await this.initializeCommunicationsRoom(community);
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
      community.ecoverseID
    );
    await this.communityRepository.save(community);

    return group;
  }

  // Loads the group into the Community entity if not already present
  getUserGroups(community: ICommunity): IUserGroup[] {
    if (!community.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return community.groups;
  }

  async getCommunityOrFail(
    communityID: string,
    options?: FindOneOptions<Community>
  ): Promise<ICommunity> {
    const Community = await this.communityRepository.findOne(
      { id: communityID },
      options
    );
    if (!Community)
      throw new EntityNotFoundException(
        `Unable to find Community with ID: ${communityID}`,
        LogContext.COMMUNITY
      );
    return Community;
  }

  async removeCommunity(communityID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['applications', 'groups'],
    });

    // Remove all groups
    if (community.groups) {
      for (const group of community.groups) {
        await this.userGroupService.removeUserGroup({
          ID: group.id,
        });
      }
    }

    if (community.authorization)
      await this.authorizationDefinitionService.delete(community.authorization);

    // Remove all applications
    if (community.applications) {
      for (const application of community.applications) {
        await this.applicationService.deleteApplication({
          ID: application.id,
        });
      }
    }

    await this.communityRepository.remove(community as Community);
    return true;
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

  async getMembers(community: ICommunity): Promise<IUser[]> {
    const membershipCredential = this.getMembershipCredential(community);
    return await this.userService.usersWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async assignMember(
    membershipData: AssignCommunityMemberInput
  ): Promise<ICommunity> {
    const community = await this.getCommunityOrFail(
      membershipData.communityID,
      {
        relations: ['parentCommunity'],
      }
    );
    const userID = membershipData.userID;

    // If the parent community is set, then check if the user is also a member there
    if (community.parentCommunity) {
      const isParentMember = await this.isMember(
        userID,
        community.parentCommunity.id
      );
      if (!isParentMember)
        throw new ValidationException(
          `User (${userID}) is not a member of parent community: ${community.parentCommunity.displayName}`,
          LogContext.CHALLENGES
        );
    }

    // Assign a credential for community membership
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    const membershipCredential = this.getMembershipCredential(community);

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });

    // register the user for the community room(s)
    await this.communicationService.addUserToCommunityMessaging(
      community.communicationGroupID,
      community.communicationRoomID,
      user.email
    );

    return community;
  }

  getMembershipCredential(community: ICommunity): ICredential {
    const credential = community.credential;
    if (!credential) {
      throw new EntityNotInitializedException(
        `Unable to locate credential type for community: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return credential;
  }

  async removeMember(
    membershipData: RemoveCommunityMemberInput
  ): Promise<ICommunity> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    const community = await this.getCommunityOrFail(membershipData.communityID);
    const membershipCredential = this.getMembershipCredential(community);
    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });

    return await this.getCommunityOrFail(membershipData.communityID);
  }

  async isMember(userID: string, communityID: string): Promise<boolean> {
    const agent = await this.userService.getAgent(userID);
    const community = await this.getCommunityOrFail(communityID);
    const membershipCredential = this.getMembershipCredential(community);

    return await this.agentService.hasValidCredential(agent.id, {
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async getCommunities(ecoverseId: string): Promise<Community[]> {
    const communites = await this.communityRepository.find({
      where: { ecoverse: { id: ecoverseId } },
    });
    return communites || [];
  }

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const user = await this.userService.getUserOrFail(applicationData.userID);
    const community = (await this.getCommunityOrFail(applicationData.parentID, {
      relations: ['applications', 'parentCommunity'],
    })) as Community;

    const existingApplication = await this.applicationService.findExistingApplication(
      user.id,
      community.id
    );

    if (existingApplication) {
      throw new InvalidStateTransitionException(
        `An application for user ${existingApplication.user?.email} already exists for Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    const parentCommunity = community.parentCommunity;
    if (parentCommunity) {
      const isMember = await this.isMember(
        applicationData.userID,
        parentCommunity.id
      );
      if (!isMember)
        throw new InvalidStateTransitionException(
          `User ${applicationData.userID} is not a member of the parent Community: ${parentCommunity.displayName}.`,
          LogContext.COMMUNITY
        );
    }

    const ecoverseID = community.ecoverseID;
    if (!ecoverseID)
      throw new EntityNotInitializedException(
        `Unable to locate containing ecoverse: ${community.displayName}`,
        LogContext.COMMUNITY
      );
    const application = await this.applicationService.createApplication(
      applicationData,
      ecoverseID
    );
    community.applications?.push(application);
    await this.communityRepository.save(community);

    return application;
  }

  async getApplications(community: ICommunity): Promise<IApplication[]> {
    const communityApps = await this.getCommunityOrFail(community.id, {
      relations: ['applications'],
    });
    return communityApps?.applications || [];
  }

  async getMembersCount(community: ICommunity): Promise<number> {
    const membershipCredential = this.getMembershipCredential(community);

    return await this.agentService.countAgentsWithMatchingCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async initializeCommunicationsRoom(
    community: ICommunity
  ): Promise<ICommunity> {
    community.communicationGroupID = await this.communicationService.createCommunityGroup(
      // generate a unique identifier for the community because the community does not have an id (not persisted yet)
      community.id,
      community.displayName
    );
    community.communicationRoomID = await this.communicationService.createCommunityRoom(
      community.communicationGroupID
    );
    return await this.communityRepository.save(community);
  }

  async getCommunicationsRoom(
    community: ICommunity,
    email: string
  ): Promise<CommunicationRoomDetailsResult> {
    let communityWithRoom = community;
    if (community.communicationRoomID === '') {
      communityWithRoom = await this.initializeCommunicationsRoom(community);
    }
    const result = await this.communicationService.getRoom(
      communityWithRoom.communicationRoomID,
      email
    );
    return result;
  }
}
