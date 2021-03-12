import { ApplicationInput } from '@domain/community/application/application.dto';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory.service';
import { RestrictedGroupNames } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  GroupNotInitializedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { ApolloError } from 'apollo-server-express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { Community } from './community.entity';
import { ICommunity } from './community.interface';
import { IUser } from '../user/user.interface';
import { CommunityParent } from './community-parent.dto';

@Injectable()
export class CommunityService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private applicationFactoryService: ApplicationFactoryService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    name: string,
    restrictedGroupNames: string[]
  ): Promise<ICommunity> {
    // reate and initialise a new Community using the first returned array item
    const community = new Community(name, restrictedGroupNames);
    await this.initialiseMembers(community);
    await this.communityRepository.save(community);

    return community;
  }
  async initialiseMembers(community: ICommunity): Promise<ICommunity> {
    if (!community.groups) {
      community.groups = [];
    }
    // Check that the mandatory groups for a Community are created
    await this.userGroupService.addMandatoryGroups(
      community,
      community.restrictedGroupNames
    );

    return community;
  }

  async createGroup(
    communityID: number,
    groupName: string
  ): Promise<IUserGroup> {
    // First find the Community

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
      groupName
    );
    await this.communityRepository.save(community);

    return group;
  }

  // Loads the group into the Community entity if not already present
  async loadGroups(community: ICommunity): Promise<IUserGroup[]> {
    if (community.groups && community.groups.length > 0) {
      // Community already has groups loaded
      return community.groups;
    }
    // Community is not populated wih
    return await this.userGroupService.getGroupsOnGroupable(community);
  }

  async getParent(community: Community): Promise<typeof CommunityParent> {
    const communityParent = (await this.getCommunityOrFail(community.id, {
      relations: ['ecoverse', 'challenge', 'opportunity'],
    })) as Community;
    if (communityParent?.ecoverse) return communityParent?.ecoverse;
    if (communityParent?.challenge) return communityParent?.challenge;
    if (communityParent?.opportunity) return communityParent?.opportunity;
    throw new EntityNotFoundException(
      `Unable to locate parent for community: ${community.name}`,
      LogContext.COMMUNITY
    );
  }

  async getCommunityOrFail(
    communityID: number,
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

  async removeCommunity(communityID: number): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['opportunities', 'groups'],
    });

    // Remove all groups
    if (community.groups) {
      for (const group of community.groups) {
        await this.userGroupService.removeUserGroup(group.id);
      }
    }

    await this.communityRepository.remove(community as Community);
    return true;
  }

  async isUserMember(userID: number, communityID: number): Promise<boolean> {
    const Community = await this.getCommunityOrFail(communityID, {
      relations: ['groups'],
    });
    const membersGroup = await this.getMembersGroup(Community);
    const members = membersGroup.members;
    if (!members)
      throw new GroupNotInitializedException(
        `Members group not initialised in Community: ${communityID}`,
        LogContext.COMMUNITY
      );
    const user = members.find(user => user.id == userID);
    if (user) return true;
    return false;
  }

  async addMember(userID: number, communityID: number): Promise<IUserGroup> {
    // Try to find the user + group
    const user = await this.userService.getUserByIdOrFail(userID);

    const community = await this.getCommunityOrFail(communityID, {
      relations: ['groups'],
    });

    // Get the members group
    const membersGroup = await this.userGroupService.getGroupByName(
      community,
      RestrictedGroupNames.Members
    );
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }

  async getMembersGroup(community: ICommunity): Promise<IUserGroup> {
    const group = await this.userGroupService.getGroupByName(
      community,
      RestrictedGroupNames.Members
    );
    if (!group)
      throw new RelationshipNotFoundException(
        `Unable to locate members group on Community: ${community.id}`,
        LogContext.COMMUNITY
      );
    return group;
  }

  async getCommunities(ecoverseId: number): Promise<Community[]> {
    const communites = await this.communityRepository.find({
      where: { ecoverse: { id: ecoverseId } },
    });
    return communites || [];
  }

  async createApplication(
    id: number,
    applicationData: ApplicationInput
  ): Promise<Application> {
    const community = (await this.getCommunityOrFail(id, {
      relations: ['applications'],
    })) as Community;

    const existingApplication = community.applications?.find(
      x => x.user.id === applicationData.userId
    );

    if (existingApplication) {
      throw new ApolloError(
        `An application for user ${existingApplication.user.email} already exists for Community: ${community.id}. Application status: ${existingApplication.status}`
      );
    }

    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );

    community.applications?.push(application);
    await this.communityRepository.save(community);
    return application;
  }

  async getApplications(community: Community): Promise<Application[]> {
    const communityApps = await this.getCommunityOrFail(community.id, {
      relations: ['applications'],
    });
    return communityApps?.applications || [];
  }

  async addUserToRestrictedGroup(
    communityId: number,
    user: IUser,
    groupName: string
  ): Promise<boolean> {
    if (!(await this.groupIsRestricted(communityId, groupName)))
      throw new ValidationException(
        `${groupName} is not a restricted group name!`,
        LogContext.COMMUNITY
      );

    const community = await this.getCommunityOrFail(communityId);
    const restrictedGroup = await this.userGroupService.getGroupByName(
      community,
      groupName
    );

    if (await this.userGroupService.addUserToGroup(user, restrictedGroup)) {
      return true;
    }

    return false;
  }

  async groupIsRestricted(
    communityId: number,
    groupName: string
  ): Promise<boolean> {
    const community = await this.getCommunityOrFail(communityId);
    if (community.restrictedGroupNames.includes(groupName)) return true;
    return false;
  }
}
