import { CreateApplicationInput } from '@domain/community/application';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationFactoryService } from '@domain/community/application/application.factory.service';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  GroupNotInitializedException,
  InvalidStateTransitionException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { Community } from './community.entity';
import { ICommunity } from './community.interface';
import { IUser } from '../user/user.interface';
import { AuthorizationRoles } from '@core/authorization';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { CreateUserGroupInput } from '../user-group';
import {
  AssignCommunityMemberInput,
  RemoveCommunityMemberInput,
} from '@domain/community/community';
import { ApplicationService } from '../application/application.service';

@Injectable()
export class CommunityService {
  constructor(
    private userService: UserService,
    private userGroupService: UserGroupService,
    private applicationFactoryService: ApplicationFactoryService,
    private applicationService: ApplicationService,
    private lifecycleService: LifecycleService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    name: string,
    type: string,
    restrictedGroupNames: string[]
  ): Promise<ICommunity> {
    const community = new Community(name, type, restrictedGroupNames);

    community.groups = [];
    await this.userGroupService.addMandatoryGroups(
      community,
      community.restrictedGroupNames
    );
    await this.communityRepository.save(community);

    return community;
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    // First find the Community
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
      relations: ['applications', 'groups'],
    });

    // Remove all groups
    if (community.groups) {
      for (const group of community.groups) {
        await this.userGroupService.removeUserGroup({ ID: group.id });
      }
    }

    // Remove all applications
    if (community.applications) {
      for (const application of community.applications) {
        await this.applicationService.delete({
          ID: application.id,
        });
        // await this.applicationLifecycleMachineService.send(
        //   new RejectApplication(application.id)
        // );
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

  async assignMember(
    membershipData: AssignCommunityMemberInput
  ): Promise<IUserGroup> {
    const community = await this.getCommunityOrFail(
      membershipData.communityID,
      {
        relations: ['groups', 'parentCommunity'],
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
          `User (${userID}) is not a member of parent community: ${community.parentCommunity.name}`,
          LogContext.CHALLENGES
        );
    }

    // Try to find the user + group
    const user = await this.userService.getUserByIdOrFail(userID);

    // Get the members group
    const membersGroup = await this.getMembersGroupOrFail(community);
    await this.userGroupService.addUserToGroup(user, membersGroup);

    return membersGroup;
  }

  async removeMember(
    membershipData: RemoveCommunityMemberInput
  ): Promise<IUserGroup> {
    const community = await this.getCommunityOrFail(
      membershipData.communityID,
      {
        relations: ['groups'],
      }
    );

    // Try to find the user
    const user = await this.userService.getUserByIdOrFail(
      membershipData.userID
    );

    // Get the members group
    const membersGroup = await this.getMembersGroupOrFail(community);
    await this.userGroupService.removeUserFromGroup(user, membersGroup);

    return membersGroup;
  }

  async isMember(userID: number, communityID: number): Promise<boolean> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: ['groups'],
    });

    const members = await this.getMembersOrFail(community);
    const user = members.find(user => user.id == userID);
    if (user) return true;
    return false;
  }

  async getMembersGroupOrFail(community: ICommunity): Promise<IUserGroup> {
    const group = await this.userGroupService.getGroupByName(
      community,
      AuthorizationRoles.Members
    );
    if (!group)
      throw new RelationshipNotFoundException(
        `Unable to locate members group on Community: ${community.id}`,
        LogContext.COMMUNITY
      );
    return group;
  }

  async getMembersOrFail(community: ICommunity): Promise<IUser[]> {
    const membersGroup = await this.getMembersGroupOrFail(community);
    const members = membersGroup.members;
    if (!members)
      throw new GroupNotInitializedException(
        `Members group not initialised in Community: ${community.id}`,
        LogContext.COMMUNITY
      );

    return members;
  }

  async getCommunities(ecoverseId: number): Promise<Community[]> {
    const communites = await this.communityRepository.find({
      where: { ecoverse: { id: ecoverseId } },
    });
    return communites || [];
  }

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<Application> {
    const community = (await this.getCommunityOrFail(applicationData.parentID, {
      relations: ['applications', 'parentCommunity'],
    })) as Community;

    const existingApplication = community.applications?.find(
      x => x.user.id === applicationData.userId
    );

    if (existingApplication) {
      throw new InvalidStateTransitionException(
        `An application for user ${existingApplication.user.email} already exists for Community: ${community.id}. Application status: ${existingApplication.status}`,
        LogContext.COMMUNITY
      );
    }

    const parentCommunity = community.parentCommunity;
    if (parentCommunity) {
      const isMember = await this.isMember(
        applicationData.userId,
        parentCommunity.id
      );
      if (!isMember)
        throw new InvalidStateTransitionException(
          `User ${applicationData.userId} is not a member of the parent Community: ${parentCommunity.name}.`,
          LogContext.COMMUNITY
        );
    }

    const application = await this.applicationFactoryService.createApplication(
      applicationData
    );

    community.applications?.push(application);
    await this.communityRepository.save(community);

    // store the application ID on the lifecycle context so it knows what to approve
    await this.lifecycleService.storeParentID(
      application.lifecycle,
      application.id.toString()
    );
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
    const community = await this.getCommunityOrFail(communityId, {
      relations: ['groups'],
    });

    if (!(await this.groupIsRestricted(community, groupName)))
      throw new ValidationException(
        `${groupName} is not a restricted group name!`,
        LogContext.COMMUNITY
      );

    const restrictedGroup = await this.userGroupService.getGroupByName(
      community,
      groupName
    );
    if (!restrictedGroup)
      throw new EntityNotInitializedException(
        `${groupName} not found!`,
        LogContext.COMMUNITY
      );

    if (await this.userGroupService.addUserToGroup(user, restrictedGroup)) {
      return true;
    }

    return false;
  }

  async groupIsRestricted(
    community: ICommunity,
    groupName: string
  ): Promise<boolean> {
    if (community.restrictedGroupNames.includes(groupName)) return true;
    return false;
  }

  async approveApplication(applicationId: number) {
    throw new InvalidStateTransitionException(
      `something ${applicationId}`,
      LogContext.COMMUNITY
    );

    // if (application.status == ApplicationStatus.approved) {
    //   throw new InvalidStateTransitionException(
    //     'Application has already been approved!',
    //     LogContext.COMMUNITY
    //   );
    // } else if (application.status == ApplicationStatus.rejected) {
    //   throw new InvalidStateTransitionException(
    //     'Application has already been rejected!',
    //     LogContext.COMMUNITY
    //   );
    // }

    // if (!application.community)
    //   throw new RelationshipNotFoundException(
    //     `Unable to load community for application ${applicationId} `,
    //     LogContext.COMMUNITY
    //   );
    // await this.assignMember({
    //   userID: application.user.id,
    //   communityID: application.community?.id,
    // });

    // application.status = ApplicationStatus.approved;

    // await this.applicationService.save(application);

    // return application;
  }

  // async updateApplicationState(
  //   applicationId: number,
  //   event: string
  // ): Promise<Application> {

  //   // await this.lifecycleService.updateState(
  //   //   application.lifecycle,
  //   //   event,
  //   //   this.getLifecycleOptions()
  //   // );

  //   if (event === 'APPROVE') {
  //     return this.approveApplication(applicationId);
  //   }

  //   return await this.appl

  //   return application;
  // }

  // The lifecycle definition can be serialized as a string and stored at instantiation.
  // However the actions include functiton defitions which cannot be converted to JSON for
  // storage so need to have this function below. Far from ideal, open to better solutions...
  // Note: cannot look up on the parent of the lifecycle as there can be potentially
  // multiple lifecycles per challenge etc.
  // getLifecycleOptions() {
  //   return communityLifecycleApplicationOptions;
  // }
}
