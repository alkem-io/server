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
import { ConfigurationTypes, LogContext } from '@common/enums';
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
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { ICredential } from '@domain/agent/credential';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@services/platform/communication/communication.service';
import { CommunitySendMessageInput } from './dto/community.dto.send.message';
import { ConfigService } from '@nestjs/config';
import { CommunityRemoveMessageInput } from './dto/community.dto.remove.message';
import { CommunityRoomResult } from './dto/community.dto.room.result';
import { CommunityType } from '@common/enums/community.type';

@Injectable()
export class CommunityService {
  private communicationsEnabled = false;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private configService: ConfigService,
    private userService: UserService,
    private userGroupService: UserGroupService,
    private applicationService: ApplicationService,
    private communicationService: CommunicationService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    // need both to be true
    this.communicationsEnabled = this.configService.get(
      ConfigurationTypes.COMMUNICATIONS
    )?.enabled;
  }

  async createCommunity(
    name: string,
    type: CommunityType
  ): Promise<ICommunity> {
    const community = new Community(name, type);
    community.authorization = new AuthorizationPolicy();

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

    // Remove all issued membership credentials
    const members = await this.getMembers(community);
    for (const member of members) {
      await this.removeMember({ userID: member.id, communityID: community.id });
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

    // register the user for the community rooms
    await this.communicationService.addUserToCommunityMessaging(
      community.communicationGroupID,
      [community.updatesRoomID, community.discussionRoomID],
      user.communicationID
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

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
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
    const isExistingMember = await this.isMember(
      applicationData.userID,
      community.id
    );
    if (isExistingMember)
      throw new InvalidStateTransitionException(
        `User ${applicationData.userID} is already a member of the Community: ${community.displayName}.`,
        LogContext.COMMUNITY
      );

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

  async getCommunityInNameableScopeOrFail(
    communityID: string,
    nameableScopeID: string
  ): Promise<ICommunity> {
    const community = await this.communityRepository.findOne({
      id: communityID,
      ecoverseID: nameableScopeID,
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

  async initializeCommunicationsRoom(
    community: ICommunity
  ): Promise<ICommunity> {
    try {
      community.communicationGroupID =
        await this.communicationService.createCommunityGroup(
          community.id,
          community.displayName
        );
      community.updatesRoomID =
        await this.communicationService.createCommunityRoom(
          community.communicationGroupID,
          `${community.displayName} updates`,
          { communityId: community.id }
        );
      community.discussionRoomID =
        await this.communicationService.createCommunityRoom(
          community.communicationGroupID,
          `${community.displayName} discussion`,
          { communityId: community.id }
        );
      return await this.communityRepository.save(community);
    } catch (error) {
      this.logger.error?.(
        `Unable to initialize communications for community (${community.displayName}): ${error}`,
        LogContext.COMMUNICATION
      );
    }
    return community;
  }

  async getUpdatesCommunicationsRoom(
    community: ICommunity,
    communicationID: string
  ): Promise<CommunityRoomResult> {
    if (this.communicationsEnabled && community.communicationGroupID === '') {
      await this.initializeCommunicationsRoom(community);
    }

    await this.communicationService.ensureUserHasAccesToCommunityMessaging(
      community.communicationGroupID,
      [community.updatesRoomID],
      communicationID
    );

    const room = await this.communicationService.getCommunityRoom(
      community.updatesRoomID,
      communicationID
    );

    await this.userService.populateRoomMessageSenders([room]);

    return room;
  }

  async getDiscussionCommunicationsRoom(
    community: ICommunity,
    communicationID: string
  ): Promise<CommunityRoomResult> {
    if (this.communicationsEnabled && community.communicationGroupID === '') {
      await this.initializeCommunicationsRoom(community);
    }

    await this.communicationService.ensureUserHasAccesToCommunityMessaging(
      community.communicationGroupID,
      [community.discussionRoomID],
      communicationID
    );

    const room = await this.communicationService.getCommunityRoom(
      community.discussionRoomID,
      communicationID
    );

    await this.userService.populateRoomMessageSenders([room]);

    return room;
  }

  async sendMessageToCommunityUpdates(
    community: ICommunity,
    communicationID: string,
    messageData: CommunitySendMessageInput
  ): Promise<string> {
    await this.communicationService.ensureUserHasAccesToCommunityMessaging(
      community.communicationGroupID,
      [community.updatesRoomID],
      communicationID
    );
    return await this.communicationService.sendMessageToCommunityRoom({
      senderCommunicationsID: communicationID,
      message: messageData.message,
      roomID: community.updatesRoomID,
    });
  }

  async sendMessageToCommunityDiscussions(
    community: ICommunity,
    communicationID: string,
    messageData: CommunitySendMessageInput
  ): Promise<string> {
    await this.communicationService.ensureUserHasAccesToCommunityMessaging(
      community.communicationGroupID,
      [community.discussionRoomID],
      communicationID
    );
    return await this.communicationService.sendMessageToCommunityRoom({
      senderCommunicationsID: communicationID,
      message: messageData.message,
      roomID: community.discussionRoomID,
    });
  }

  async removeMessageFromCommunityUpdates(
    community: ICommunity,
    communicationID: string,
    messageData: CommunityRemoveMessageInput
  ) {
    await this.communicationService.ensureUserHasAccesToCommunityMessaging(
      community.communicationGroupID,
      [community.updatesRoomID],
      communicationID
    );
    await this.communicationService.deleteMessageFromCommunityRoom({
      senderCommunicationsID: communicationID,
      messageId: messageData.messageId,
      roomID: community.updatesRoomID,
    });
  }

  async removeMessageFromCommunityDiscussions(
    community: ICommunity,
    communicationID: string,
    messageData: CommunityRemoveMessageInput
  ) {
    await this.communicationService.ensureUserHasAccesToCommunityMessaging(
      community.communicationGroupID,
      [community.discussionRoomID],
      communicationID
    );
    await this.communicationService.deleteMessageFromCommunityRoom({
      senderCommunicationsID: communicationID,
      messageId: messageData.messageId,
      roomID: community.discussionRoomID,
    });
  }
}
