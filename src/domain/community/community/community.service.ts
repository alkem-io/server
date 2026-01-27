import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LogContext } from '@common/enums/logging.context';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { IRoleSet } from '@domain/access/role-set';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ICommunication } from '@domain/communication/communication';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { Community, ICommunity } from '@domain/community/community';
import { CreateUserGroupInput } from '@domain/community/user-group/dto';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { CreateCommunityInput } from './dto/community.dto.create';

@Injectable()
export class CommunityService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private userGroupService: UserGroupService,
    private communicationService: CommunicationService,
    private communityResolverService: CommunityResolverService,
    private roleSetService: RoleSetService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    communityData: CreateCommunityInput
  ): Promise<ICommunity> {
    const community: ICommunity = new Community();
    community.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.COMMUNITY
    );
    community.roleSet = await this.roleSetService.createRoleSet(
      communityData.roleSetData
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
    community: ICommunity,
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

  async removeCommunityOrFail(communityID: string): Promise<boolean | never> {
    // Note need to load it in with all contained entities so can remove fully
    const community = await this.getCommunityOrFail(communityID, {
      relations: {
        roleSet: true,
        groups: true,
        communication: true,
      },
    });
    if (
      !community.communication ||
      !community.communication.updates ||
      !community.roleSet ||
      !community.groups
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load child entities for community for deletion: ${community.id} `,
        LogContext.COMMUNITY
      );
    }

    await this.roleSetService.removeRoleSetOrFail(community.roleSet.id);

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

    await this.communityRepository.remove(community as Community);
    return true;
  }

  async save(community: ICommunity): Promise<ICommunity> {
    return await this.communityRepository.save(community);
  }

  public async getDisplayName(community: ICommunity): Promise<string> {
    return await this.communityResolverService.getDisplayNameForRoleSetOrFail(
      community.id
    );
  }

  public async getRoleSet(community: ICommunity): Promise<IRoleSet> {
    const communityWithRoleSet = await this.getCommunityOrFail(community.id, {
      relations: { roleSet: true },
    });

    if (!communityWithRoleSet.roleSet) {
      throw new EntityNotInitializedException(
        `Unable to locate RoleSet for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithRoleSet.roleSet;
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

  public async getLevelZeroSpaceIdForCommunity(
    community: ICommunity
  ): Promise<string> {
    return await this.communityResolverService.getLevelZeroSpaceIdForCommunity(
      community.id
    );
  }
}
