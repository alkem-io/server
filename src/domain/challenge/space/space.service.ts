import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent';
import { ChallengeService } from '@domain/challenge/challenge/challenge.service';
import { CreateSpaceInput, DeleteSpaceInput } from '@domain/challenge/space';
import { INVP, NVP } from '@domain/common/nvp';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Space } from './space.entity';
import { ISpace } from './space.interface';
import { UpdateSpaceInput } from './dto/space.dto.update';
import { CreateChallengeOnSpaceInput } from './dto/space.dto.create.challenge';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { PaginationArgs } from '@core/pagination';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { SpaceMembershipCollaborationInfo } from '@services/api/me/space.membership.type';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { UpdateSpaceSettingsOnSpaceInput } from './dto/space.dto.update.settings';
import { SpaceType } from '@common/enums/space.type';
import { IAccount } from '../account/account.interface';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';

@Injectable()
export class SpaceService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private challengeService: ChallengeService,
    private spacesFilterService: SpaceFilterService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createSpace(
    spaceData: CreateSpaceInput,
    account: IAccount,
    agentInfo?: AgentInfo
  ): Promise<ISpace> {
    spaceData.type = SpaceType.SPACE;
    const space: ISpace = Space.create(spaceData);

    return await this.baseChallengeService.initialise(
      space,
      this.spaceRepository,
      spaceData,
      account,
      agentInfo
    );
  }

  async validateSpaceData(spaceData: CreateSpaceInput) {
    if (!(await this.isNameIdAvailable(spaceData.nameID)))
      throw new ValidationException(
        `Unable to create Space: the provided nameID is already taken: ${spaceData.nameID}`,
        LogContext.CHALLENGES
      );
  }

  async save(space: ISpace): Promise<ISpace> {
    return await this.spaceRepository.save(space);
  }

  async update(spaceData: UpdateSpaceInput): Promise<ISpace> {
    return await this.baseChallengeService.update(
      spaceData,
      this.spaceRepository
    );
  }

  async deleteSpace(deleteData: DeleteSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(deleteData.ID, {
      relations: {
        challenges: true,
      },
    });

    if (!space.challenges) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for deletion of space ${space.id} `,
        LogContext.CHALLENGES
      );
    }

    // Do not remove a space that has child challenges, require these to be individually first removed
    if (space.challenges.length > 0)
      throw new OperationNotAllowedException(
        `Unable to remove Space (${space.nameID}) as it contains ${space.challenges.length} challenges`,
        LogContext.CHALLENGES
      );

    await this.baseChallengeService.deleteEntities(
      space.id,
      this.spaceRepository
    );

    const result = await this.spaceRepository.remove(space as Space);
    result.id = deleteData.ID;
    return result;
  }

  public async getSpacesForInnovationHub({
    id,
    type,
    spaceListFilter,
    spaceVisibilityFilter,
  }: InnovationHub): Promise<Space[]> | never {
    if (type === InnovationHubType.VISIBILITY) {
      if (!spaceVisibilityFilter) {
        throw new EntityNotInitializedException(
          `'spaceVisibilityFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      return this.spaceRepository.findBy({
        account: {
          license: {
            visibility: spaceVisibilityFilter,
          },
        },
      });
    }

    if (type === InnovationHubType.LIST) {
      if (!spaceListFilter) {
        throw new EntityNotInitializedException(
          `'spaceListFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      const unsortedSpaces = await this.spaceRepository.findBy([
        { id: In(spaceListFilter) },
      ]);
      // sort according to the order of the space list filter
      return unsortedSpaces.sort(
        (a, b) => spaceListFilter.indexOf(a.id) - spaceListFilter.indexOf(b.id)
      );
    }

    throw new NotSupportedException(
      `Unsupported Innovation Hub type: '${type}'`,
      LogContext.INNOVATION_HUB
    );
  }

  public getSettings(space: ISpace): ISpaceSettings {
    return this.baseChallengeService.getSettings(space);
  }

  /***
   * Checks if Spaces exists against a list of IDs
   * @param ids List of Space ids
   * @returns  <i>true</i> if all Spaces exist; list of ids of the Spaces that doesn't, otherwise
   */
  public async spacesExist(ids: string[]): Promise<true | string[]> {
    if (!ids.length) {
      return true;
    }

    const spaces = await this.spaceRepository.find({
      where: { id: In(ids) },
      select: { id: true },
    });

    if (!spaces.length) {
      return ids;
    }

    const notExist = [...ids];

    spaces.forEach(space => {
      const idIndex = notExist.findIndex(x => x === space.id);

      if (idIndex >= -1) {
        notExist.splice(idIndex, 1);
      }
    });

    return notExist.length > 0 ? notExist : true;
  }

  async getSpacesSorted(
    args: SpacesQueryArgs,
    options?: FindManyOptions<Space>
  ): Promise<ISpace[]> {
    const spaces = await this.getSpacesUnsorted(args, options);

    if (spaces.length === 0) return spaces;

    return await this.orderSpacesDefault(spaces);
  }

  async getSpacesUnsorted(
    args: SpacesQueryArgs,
    options?: FindManyOptions<Space>
  ): Promise<ISpace[]> {
    const visibilities = this.spacesFilterService.getAllowedVisibilities(
      args.filter
    );
    // Load the spaces
    let spaces: ISpace[];
    if (args && args.IDs) {
      spaces = await this.spaceRepository.find({
        where: {
          id: In(args.IDs),
          account: {
            license: {
              visibility: In(visibilities),
            },
          },
        },
        ...options,
      });
    } else {
      spaces = await this.spaceRepository.find({
        where: {
          account: {
            license: {
              visibility: In(visibilities),
            },
          },
        },
        ...options,
      });
    }

    if (spaces.length === 0) return [];

    return spaces;
  }

  public async getSpacesWithChildJourneys(
    args: SpacesQueryArgs,
    options?: FindManyOptions<Space>
  ): Promise<ISpace[]> {
    const visibilities = this.spacesFilterService.getAllowedVisibilities(
      args.filter
    );
    // Load the spaces
    let spaces: ISpace[];
    if (args && args.IDs) {
      spaces = await this.spaceRepository.find({
        where: {
          id: In(args.IDs),
          account: {
            license: {
              visibility: In(visibilities),
            },
          },
        },
        ...options,
        relations: {
          ...options?.relations,
          collaboration: true,
          challenges: {
            collaboration: true,
            opportunities: {
              collaboration: true,
            },
          },
        },
      });
    } else {
      spaces = await this.spaceRepository.find({
        where: {
          account: {
            license: {
              visibility: In(visibilities),
            },
          },
        },
        ...options,
        relations: {
          ...options?.relations,
          collaboration: true,
          challenges: {
            collaboration: true,
            opportunities: {
              collaboration: true,
            },
          },
        },
      });
    }

    if (spaces.length === 0) return [];

    return spaces;
  }

  // Returns a map of all collaboration IDs with parent space ID
  public getSpaceMembershipCollaborationInfo(
    spaces: ISpace[]
  ): SpaceMembershipCollaborationInfo {
    const spaceMembershipCollaborationInfo: SpaceMembershipCollaborationInfo =
      new Map();

    for (const space of spaces) {
      if (space.collaboration?.id)
        spaceMembershipCollaborationInfo.set(space.collaboration.id, space.id);

      if (space.challenges) {
        for (const challenge of space.challenges) {
          if (challenge.collaboration?.id)
            spaceMembershipCollaborationInfo.set(
              challenge.collaboration.id,
              space.id
            );

          if (challenge.opportunities) {
            for (const opportunity of challenge.opportunities) {
              if (opportunity.collaboration?.id)
                spaceMembershipCollaborationInfo.set(
                  opportunity.collaboration.id,
                  space.id
                );
            }
          }
        }
      }
    }
    return spaceMembershipCollaborationInfo;
  }

  public async orderSpacesDefault(spaces: ISpace[]): Promise<ISpace[]> {
    // Get the order to return the data in
    const sortedIDs = await this.getSpacesWithSortOrderDefault(
      spaces.flatMap(x => x.id)
    );
    const spacesResult: ISpace[] = [];
    for (const spaceID of sortedIDs) {
      const space = spaces.find(space => space.id === spaceID);
      if (space) {
        spacesResult.push(space);
      } else {
        this.logger.error(
          'Invalid state error when sorting Spaces!',
          undefined,
          LogContext.CHALLENGES
        );
      }
    }
    return spacesResult;
  }

  getPaginatedSpaces(
    paginationArgs: PaginationArgs,
    filter?: SpaceFilterInput
  ): Promise<IPaginatedType<ISpace>> {
    const visibilities =
      this.spacesFilterService.getAllowedVisibilities(filter);

    const qb = this.spaceRepository.createQueryBuilder('space');
    if (visibilities) {
      qb.leftJoinAndSelect('space.account', 'account');
      qb.leftJoinAndSelect('account.license', 'license');
      qb.leftJoinAndSelect('space.authorization', 'authorization');
      qb.where({
        account: {
          license: {
            visibility: In(visibilities),
          },
        },
      });
    }

    return getPaginationResults(qb, paginationArgs);
  }

  public async getAllSpaces(
    options?: FindManyOptions<ISpace>
  ): Promise<ISpace[]> {
    return this.spaceRepository.find(options);
  }

  private async getSpacesWithSortOrderDefault(
    IDs: string[]
  ): Promise<string[]> {
    // Then load data to do the sorting
    const spacesDataForSorting = await this.spaceRepository
      .createQueryBuilder('space')
      .leftJoinAndSelect('space.challenges', 'challenge')
      .leftJoinAndSelect('space.account', 'account')
      .leftJoinAndSelect('account.license', 'license')
      .leftJoinAndSelect('space.authorization', 'authorization_policy')
      .leftJoinAndSelect('challenge.opportunities', 'opportunities')
      .whereInIds(IDs)
      .getMany();

    return this.sortSpacesDefault(spacesDataForSorting);
  }

  private sortSpacesDefault(spacesData: Space[]): string[] {
    const sortedSpaces = spacesData.sort((a, b) => {
      const visibilityA = a.account?.license?.visibility;
      const visibilityB = b.account?.license?.visibility;
      if (
        visibilityA !== visibilityB &&
        (visibilityA === SpaceVisibility.DEMO ||
          visibilityB === SpaceVisibility.DEMO)
      )
        return visibilityA === SpaceVisibility.DEMO ? 1 : -1;

      if (
        a.authorization?.anonymousReadAccess === true &&
        b.authorization?.anonymousReadAccess === false
      )
        return -1;
      if (
        a.authorization?.anonymousReadAccess === false &&
        b.authorization?.anonymousReadAccess === true
      )
        return 1;

      if (!a.challenges && b.challenges) return 1;
      if (a.challenges && !b.challenges) return -1;
      if (!a.challenges && !b.challenges) return 0;

      // Shouldn't get there
      if (!a.challenges || !b.challenges)
        throw new ValidationException(
          `Critical error when comparing Spaces! Critical error when loading Challenges for Space ${a} and Space ${b}`,
          LogContext.CHALLENGES
        );

      const oppChallCountA = this.getChallengeAndOpportunitiesCount(
        a?.challenges
      );
      const oppChallCountB = this.getChallengeAndOpportunitiesCount(
        b?.challenges
      );

      if (oppChallCountA > oppChallCountB) return -1;
      if (oppChallCountA < oppChallCountB) return 1;

      return 0;
    });

    const sortedIDs: string[] = [];
    for (const space of sortedSpaces) {
      sortedIDs.push(space.id);
    }
    return sortedIDs;
  }

  private getChallengeAndOpportunitiesCount(challenges: IChallenge[]): number {
    let challengeAndOpportunitiesCount = 0;
    for (const challenge of challenges) {
      challengeAndOpportunitiesCount++;

      if (challenge.opportunities)
        challengeAndOpportunitiesCount += challenge.opportunities.length;
    }
    return challengeAndOpportunitiesCount;
  }

  public getSpacesByVisibilities(
    spaceIds: string[],
    visibilities: SpaceVisibility[] = []
  ) {
    return this.spaceRepository.find({
      where: {
        id: In(spaceIds),
        account: {
          license: {
            visibility: visibilities.length ? In(visibilities) : undefined,
          },
        },
      },
    });
  }

  public getSpacesById(
    spaceIdsOrNameIds: string[],
    options?: FindManyOptions<Space>
  ) {
    return this.spaceRepository.find({
      ...options,
      where: options?.where
        ? Array.isArray(options.where)
          ? [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              ...options.where,
            ]
          : [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              options.where,
            ]
        : [{ id: In(spaceIdsOrNameIds) }, { nameID: In(spaceIdsOrNameIds) }],
    });
  }

  async getSpaceOrFail(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const space = await this.getSpace(spaceID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space with ID: ${spaceID}`,
        LogContext.CHALLENGES
      );
    return space;
  }

  async getSpace(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    let space: ISpace | null = null;
    if (spaceID.length === UUID_LENGTH) {
      space = await this.spaceRepository.findOne({
        where: { id: spaceID },
        ...options,
      });
    }
    if (!space) {
      // look up based on nameID
      space = await this.spaceRepository.findOne({
        where: { nameID: spaceID },
        ...options,
      });
    }
    return space;
  }

  public async updateSpacePlatformSettings(
    space: ISpace,
    updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    if (updateData.nameID !== space.nameID) {
      // updating the nameID, check new value is allowed
      const updateAllowed = await this.isNameIdAvailable(updateData.nameID);
      if (!updateAllowed) {
        throw new ValidationException(
          `Unable to update Space nameID: the provided nameID is already taken: ${updateData.nameID}`,
          LogContext.ACCOUNT
        );
      }
      space.nameID = updateData.nameID;
    }
    return await this.save(space);
  }

  public async updateSpaceSettings(
    space: ISpace,
    settingsData: UpdateSpaceSettingsOnSpaceInput
  ): Promise<ISpace> {
    return await this.baseChallengeService.updateSettings(
      space,
      this.spaceRepository,
      settingsData.settings
    );
  }

  async getStorageAggregatorOrFail(
    spaceId: string
  ): Promise<IStorageAggregator> {
    return await this.baseChallengeService.getStorageAggregator(
      spaceId,
      this.spaceRepository
    );
  }

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const challengeCount = await this.spaceRepository.countBy({
      nameID: nameID,
    });
    if (challengeCount != 0) return false;

    // check restricted space names
    const restrictedSpaceNames = ['user', 'organization'];
    if (restrictedSpaceNames.includes(nameID.toLowerCase())) return false;

    return true;
  }

  async getChallenges(
    space: ISpace,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<IChallenge[]> {
    let spaceWithChallenges;
    if (args && args.IDs) {
      {
        spaceWithChallenges = await this.getSpaceOrFail(space.id, {
          relations: {
            challenges: {
              profile: true,
            },
          },
        });
        spaceWithChallenges.challenges = spaceWithChallenges.challenges?.filter(
          c => args.IDs?.includes(c.id)
        );
      }
    } else
      spaceWithChallenges = await this.getSpaceOrFail(space.id, {
        relations: {
          challenges: {
            profile: true,
          },
        },
      });

    const challenges = spaceWithChallenges.challenges;
    if (!challenges) {
      throw new RelationshipNotFoundException(
        `Unable to load challenges for Space ${space.id} `,
        LogContext.CHALLENGES
      );
    }

    const limitAndShuffled = limitAndShuffle(
      challenges,
      args?.limit,
      args?.shuffle
    );

    // Sort the challenges base on their display name
    const sortedChallenges = limitAndShuffled.sort((a, b) =>
      a.profile.displayName.toLowerCase() > b.profile.displayName.toLowerCase()
        ? 1
        : -1
    );
    return sortedChallenges;
  }

  async getChallengeInAccount(
    challengeID: string,
    space: ISpace
  ): Promise<IChallenge | null> {
    return await this.challengeService.getChallengeInAccount(
      challengeID,
      space.account.id
    );
  }

  async getCommunity(space: ISpace): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      space.id,
      this.spaceRepository
    );
  }

  async getCommunityPolicy(space: ISpace): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      space.id,
      this.spaceRepository
    );
  }

  async getContext(space: ISpace): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      space.id,
      this.spaceRepository
    );
  }

  async getProfile(space: ISpace): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      space.id,
      this.spaceRepository
    );
  }

  public async getCollaborationOrFail(
    spaceIdOrEntity: ISpace | string
  ): Promise<ICollaboration> | never {
    const spaceId =
      typeof spaceIdOrEntity === 'string'
        ? spaceIdOrEntity
        : spaceIdOrEntity.id;
    return await this.baseChallengeService.getCollaborationOrFail(
      spaceId,
      this.spaceRepository
    );
  }

  async validateChallengeNameIdOrFail(
    proposedNameID: string,
    accountID: string
  ) {
    await this.baseChallengeService.isNameAvailableInAccountOrFail(
      proposedNameID,
      accountID
    );
  }

  async createChallengeInSpace(
    challengeData: CreateChallengeOnSpaceInput,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    const space = await this.getSpaceOrFail(challengeData.spaceID, {
      relations: {
        account: true,
        storageAggregator: true,
        challenges: true,
        community: true,
      },
    });
    await this.validateChallengeNameIdOrFail(
      challengeData.nameID,
      space.account.id
    );
    if (!space.storageAggregator || !space.account) {
      throw new EntityNotFoundException(
        `Unable to retrieve entities on space for creating challenge: ${space.id}`,
        LogContext.CHALLENGES
      );
    }

    // Update the challenge data being passed in to set the storage aggregator to use
    challengeData.storageAggregatorParent = space.storageAggregator;
    challengeData.level = space.level + 1;
    const newChallenge = await this.challengeService.createChallenge(
      challengeData,
      space.account,
      agentInfo
    );

    return await this.addChallengeToSpace(space, newChallenge);
  }

  async addChallengeToSpace(
    space: ISpace,
    challenge: IChallenge
  ): Promise<IChallenge> {
    if (!space.challenges || !space.community)
      throw new ValidationException(
        `Unable to add Challenge to space, missing relations: ${space.id}`,
        LogContext.CHALLENGES
      );

    space.challenges.push(challenge);
    // Finally set the community relationship
    await this.baseChallengeService.setCommunityHierarchyForSubspace(
      space.community,
      challenge.community
    );

    await this.spaceRepository.save(space);
    return challenge;
  }

  async getChallenge(challengeID: string, space: ISpace): Promise<IChallenge> {
    return await this.challengeService.getChallengeInAccountScopeOrFail(
      challengeID,
      space.account.id
    );
  }

  async getMetrics(space: ISpace): Promise<INVP[]> {
    const metrics = await this.baseChallengeService.getMetrics(
      space,
      this.spaceRepository
    );

    if (!space.account) {
      throw new EntityNotInitializedException(
        'Space account not initialized',
        LogContext.CHALLENGES
      );
    }
    const account = space.account;
    // Challenges
    const challengesCount =
      await this.challengeService.getChallengesInAccountCount(account.id);
    const challengesTopic = new NVP('challenges', challengesCount.toString());
    challengesTopic.id = `challenges-${space.id}`;
    metrics.push(challengesTopic);

    return metrics;
  }

  async getChallengesCount(spaceID: string): Promise<number> {
    return await this.challengeService.getChallengesInAccountCount(spaceID);
  }

  async getAgent(spaceID: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(
      spaceID,
      this.spaceRepository
    );
  }

  async getMembersCount(space: ISpace): Promise<number> {
    return await this.baseChallengeService.getMembersCount(
      space,
      this.spaceRepository
    );
  }
}
