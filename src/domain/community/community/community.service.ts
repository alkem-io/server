import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CreateUserGroupInput } from '@domain/community/user-group/dto';
import { Community, ICommunity } from '@domain/community/community';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICommunication } from '@domain/communication/communication';
import { LogContext } from '@common/enums/logging.context';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { CommunityGuidelinesService } from '../community-guidelines/community.guidelines.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { CreateCommunityInput } from './dto/community.dto.create';
import { ICommunityGuidelines } from '../community-guidelines/community.guidelines.interface';
import { IContributor } from '../contributor/contributor.interface';
import { IUser } from '../user/user.interface';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { RoleManagerService } from '@domain/access/role-manager/role.manager.service';
import { IRoleManager } from '@domain/access/role-manager';

@Injectable()
export class CommunityService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupService: UserGroupService,
    private communicationService: CommunicationService,
    private communityResolverService: CommunityResolverService,
    private communityGuidelinesService: CommunityGuidelinesService,
    private roleManagerService: RoleManagerService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    communityData: CreateCommunityInput,
    storageAggregator: IStorageAggregator
  ): Promise<ICommunity> {
    const community: ICommunity = new Community();
    community.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNITY
    );
    community.roleManager = await this.roleManagerService.createRoleManager(
      communityData.roleManagerData
    );

    community.guidelines =
      await this.communityGuidelinesService.createCommunityGuidelines(
        communityData.guidelines,
        storageAggregator
      );

    community.groups = [];
    community.communication =
      await this.communicationService.createCommunication(
        communityData.name,
        ''
      );
    return community;
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const communityID = groupData.parentID;
    const groupName = groupData.profile.displayName;

    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to Community (${communityID})`,
      LogContext.COMMUNITY
    );

    // Try to find the Community
    const community = await this.getCommunityOrFail(communityID, {
      relations: { groups: true },
    });

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCommunity(
        community.id
      );
    const group = await this.userGroupService.addGroupWithName(
      community,
      groupName,
      storageAggregator
    );
    await this.communityRepository.save(community);

    return group;
  }

  // Loads the group into the Community entity if not already present
  async getUserGroups(community: ICommunity): Promise<IUserGroup[]> {
    const communityWithGroups = await this.getCommunityOrFail(community.id, {
      relations: { groups: true },
    });
    if (!communityWithGroups.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGroups.groups;
  }

  // Loads the group into the Community entity if not already present
  async getUserGroup(
    community: IRoleManager,
    groupID: string
  ): Promise<IUserGroup> {
    const communityWithGroups = await this.getCommunityOrFail(community.id, {
      relations: { groups: true },
    });
    if (!communityWithGroups.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    const result = communityWithGroups.groups.find(
      group => group.id === groupID
    );
    if (!result) {
      throw new EntityNotFoundException(
        `Unable to find group with ID: '${groupID}'`,
        LogContext.COMMUNITY,
        { communityId: community.id }
      );
    }
    return result;
  }

  async getCommunityOrFail(
    communityID: string,
    options?: FindOneOptions<Community>
  ): Promise<ICommunity | never> {
    const community = await this.communityRepository.findOne({
      where: { id: communityID },
      ...options,
    });
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
      relations: {
        roleManager: true,
        groups: true,
        communication: true,
        guidelines: true,
      },
    });
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.roleManager ||
      !community.groups ||
      !community.guidelines
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community for deletion: ${community.id} `,
        LogContext.COMMUNITY
      );
    }

    // Remove all groups
    for (const group of community.groups) {
      await this.userGroupService.removeUserGroup({
        ID: group.id,
      });
    }

    if (community.authorization)
      await this.authorizationPolicyService.delete(community.authorization);

    await this.communicationService.removeCommunication(
      community.communication.id
    );

    await this.roleManagerService.removeRoleManager(community.roleManager.id);

    await this.communityGuidelinesService.deleteCommunityGuidelines(
      community.guidelines.id
    );

    await this.communityRepository.remove(community as Community);
    return true;
  }

  async save(community: IRoleManager): Promise<IRoleManager> {
    return await this.communityRepository.save(community);
  }

  async getParentCommunity(
    community: ICommunity
  ): Promise<ICommunity | undefined> {
    const communityWithParent = await this.getCommunityOrFail(community.id, {
      relations: { parentCommunity: true },
    });

    const parentCommunity = communityWithParent?.parentCommunity;
    if (parentCommunity) {
      return await this.getCommunityOrFail(parentCommunity.id);
    }
    return undefined;
  }

  public setParentCommunity(
    community?: ICommunity,
    parentCommunity?: ICommunity
  ): ICommunity {
    if (!community || !parentCommunity) {
      throw new EntityNotInitializedException(
        'Community not set',
        LogContext.COMMUNITY
      );
    }
    community.parentCommunity = parentCommunity;
    // Also update the communityPolicy
    community.roleManager = this.roleManagerService.inheritParentCredentials(
      community.roleManager
    );

    return community;
  }

  public async getDisplayName(community: ICommunity): Promise<string> {
    return await this.communityResolverService.getDisplayNameForRoleManagerOrFail(
      community.id
    );
  }

  public async addMemberToCommunication(
    contributor: IContributor,
    community: ICommunity
  ): Promise<void> {
    // register the user for the community rooms
    const communication = await this.getCommunication(community.id);
    this.communicationService
      .addContributorToCommunications(
        communication,
        contributor.communicationID
      )
      .catch(error =>
        this.logger.error(
          `Unable to add user to community messaging (${community.id}): ${error}`,
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public async removeMemberFromCommunication(
    community: ICommunity,
    user: IUser
  ): Promise<void> {
    const communication = await this.getCommunication(community.id);
    this.communicationService
      .removeUserFromCommunications(communication, user)
      .catch(error =>
        this.logger.error(
          `Unable remove user from community messaging (${community.id}): ${error}`,
          error?.stack,
          LogContext.COMMUNICATION
        )
      );
  }

  public async getRoleManager(community: ICommunity): Promise<IRoleManager> {
    const communityWithRoleManager = await this.getCommunityOrFail(
      community.id,
      {
        relations: { roleManager: true },
      }
    );

    if (!communityWithRoleManager.roleManager) {
      throw new EntityNotInitializedException(
        `Unable to locate Role Manager for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithRoleManager.roleManager;
  }

  public async getCommunityGuidelines(
    community: ICommunity
  ): Promise<ICommunityGuidelines> {
    const communityWithGuidelines = await this.getCommunityOrFail(
      community.id,
      {
        relations: { guidelines: true },
      }
    );

    if (!communityWithGuidelines.guidelines) {
      throw new EntityNotInitializedException(
        `Unable to locate guidelines for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGuidelines.guidelines;
  }

  async getCommunication(
    communityID: string,
    relations?: FindOptionsRelations<ICommunity>
  ): Promise<ICommunication> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: { communication: true, ...relations },
    });

    const communication = community.communication;
    if (!communication) {
      throw new EntityNotInitializedException(
        `Unable to locate communication for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communication;
  }

  public async isCommunityAccountMatchingVcAccount(
    communityID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    return await this.communityResolverService.isCommunityAccountMatchingVcAccount(
      communityID,
      virtualContributorID
    );
  }

  public async getLevelZeroSpaceIdForCommunity(
    community: IRoleManager
  ): Promise<string> {
    return await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
      community.id
    );
  }

  async isSpaceCommunity(community: ICommunity): Promise<boolean> {
    const parentCommunity = await this.getParentCommunity(community);

    return parentCommunity === undefined;
  }
}
