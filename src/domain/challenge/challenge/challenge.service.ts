import {
  EntityNotFoundException,
  EntityNotInitializedException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import {
  CreateChallengeInput,
  DeleteChallengeInput,
  UpdateChallengeInput,
} from '@domain/challenge/challenge';
import { IContext } from '@domain/context/context';
import { NVP } from '@domain/common/nvp';
import { OpportunityService } from '@domain/challenge/opportunity/opportunity.service';
import {
  CreateOpportunityInput,
  IOpportunity,
} from '@domain/challenge/opportunity';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { LogContext } from '@common/enums';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, IsNull, Not, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ICommunity } from '@domain/community/community';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { UUID_LENGTH } from '@common/constants';
import { IAgent } from '@domain/agent/agent';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IChallenge } from './challenge.interface';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { UpdateChallengeSettingsInput } from './dto/challenge.dto.update.settings';
import { IAccount } from '../account/account.interface';
import { SpaceType } from '@common/enums/space.type';
@Injectable()
export class ChallengeService {
  constructor(
    private opportunityService: OpportunityService,
    private baseChallengeService: BaseChallengeService,
    @InjectRepository(Challenge)
    private challengeRepository: Repository<Challenge>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createChallenge(
    challengeData: CreateChallengeInput,
    account: IAccount,
    agentInfo?: AgentInfo
  ): Promise<IChallenge> {
    const challenge: IChallenge = Challenge.create(challengeData);
    challenge.type = SpaceType.CHALLENGE;

    challenge.opportunities = [];

    return await this.baseChallengeService.initialise(
      challenge,
      this.challengeRepository,
      challengeData,
      account,
      agentInfo
    );
  }

  async save(challenge: IChallenge): Promise<IChallenge> {
    return await this.challengeRepository.save(challenge);
  }

  async updateChallenge(
    challengeData: UpdateChallengeInput
  ): Promise<IChallenge> {
    const baseChallenge = await this.baseChallengeService.update(
      challengeData,
      this.challengeRepository
    );

    return await this.getChallengeOrFail(baseChallenge.id);
  }

  async deleteChallenge(deleteData: DeleteChallengeInput): Promise<IChallenge> {
    const challengeID = deleteData.ID;
    // Note need to load it in with all contained entities so can remove fully
    const challenge = await this.getChallengeOrFail(challengeID, {
      relations: {
        opportunities: true,
      },
    });

    if (challenge.opportunities && challenge.opportunities.length > 0)
      throw new OperationNotAllowedException(
        `Unable to remove challenge (${challenge.nameID}) as it contains ${challenge.opportunities.length} opportunities`,
        LogContext.CHALLENGES
      );

    await this.baseChallengeService.deleteEntities(
      challengeID,
      this.challengeRepository
    );

    const result = await this.challengeRepository.remove(
      challenge as Challenge
    );
    result.id = deleteData.ID;
    return result;
  }

  async getChallengeInAccount(
    challengeID: string,
    accountID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge | null> {
    let challenge: IChallenge | null = null;
    if (challengeID.length == UUID_LENGTH) {
      challenge = await this.challengeRepository.findOne({
        where: {
          id: challengeID,
          account: {
            id: accountID,
          },
        },
        ...options,
      });
    }
    if (!challenge) {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne({
        where: {
          nameID: challengeID,
          account: {
            id: accountID,
          },
        },
        ...options,
      });
    }

    return challenge;
  }

  async getChallengeInAccountScopeOrFail(
    challengeID: string,
    accountID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge | never> {
    const challenge = await this.getChallengeInAccount(
      challengeID,
      accountID,
      options
    );

    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    return challenge;
  }

  async getChallengeOrFail(
    challengeID: string,
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge | never> {
    let challenge: IChallenge | null = null;
    if (challengeID.length == UUID_LENGTH) {
      challenge = await this.challengeRepository.findOne({
        where: { id: challengeID },
        ...options,
      });
    }
    if (!challenge) {
      // look up based on nameID
      challenge = await this.challengeRepository.findOne({
        where: { nameID: challengeID },
        ...options,
      });
    }

    if (!challenge) {
      throw new EntityNotFoundException(
        `Unable to find challenge with ID: ${challengeID}`,
        LogContext.CHALLENGES
      );
    }

    return challenge;
  }

  async getCommunity(challengeId: string): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      challengeId,
      this.challengeRepository
    );
  }

  public async getAccountOrFail(challengeID: string): Promise<IAccount> {
    return await this.baseChallengeService.getAccountOrFail(
      challengeID,
      this.challengeRepository
    );
  }

  async getProfile(challenge: IChallenge): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      challenge.id,
      this.challengeRepository
    );
  }

  async getCommunityPolicy(challengeId: string): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      challengeId,
      this.challengeRepository
    );
  }

  async getContext(challengeId: string): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      challengeId,
      this.challengeRepository
    );
  }

  public async getCollaboration(
    challenge: IChallenge
  ): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaborationOrFail(
      challenge.id,
      this.challengeRepository
    );
  }

  async getAgent(challengeId: string): Promise<IAgent> {
    return await this.baseChallengeService.getAgent(
      challengeId,
      this.challengeRepository
    );
  }

  public async updateChallengeSettings(
    challenge: IChallenge,
    settingsData: UpdateChallengeSettingsInput
  ): Promise<IChallenge> {
    return this.baseChallengeService.updateSettings(
      challenge,
      this.challengeRepository,
      settingsData.settings
    );
  }

  async getOpportunities(
    challengeId: string,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<IOpportunity[]> {
    const challenge = await this.getChallengeOrFail(challengeId, {
      relations: {
        opportunities: {
          profile: true,
        },
      },
    });

    const { IDs, limit, shuffle } = args ?? {};
    const opportunities = challenge.opportunities;
    if (!opportunities)
      throw new RelationshipNotFoundException(
        `Unable to load Opportunities for challenge ${challengeId} `,
        LogContext.COLLABORATION
      );
    this.logger.verbose?.(
      `Querying all Opportunities with limit: ${limit}, shuffle: ${shuffle} and in list: ${IDs}`,
      LogContext.CHALLENGES
    );

    const filteredOpportunities = IDs
      ? opportunities.filter(({ id }) => IDs.includes(id))
      : opportunities;

    const limitAndShuffled = limitAndShuffle(
      filteredOpportunities,
      limit,
      shuffle
    );

    // Sort the opportunities base on their display name
    const sortedOpportunities = limitAndShuffled.sort((a, b) =>
      a.profile.displayName.toLowerCase() > b.profile.displayName.toLowerCase()
        ? 1
        : -1
    );
    return sortedOpportunities;
  }

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    account: IAccount,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    this.logger.verbose?.(
      `Adding Opportunity to Challenge (${opportunityData.challengeID})`,
      LogContext.CHALLENGES
    );

    const challenge = await this.getChallengeOrFail(
      opportunityData.challengeID,
      {
        relations: {
          storageAggregator: true,
          opportunities: true,
          community: true,
          account: true,
        },
      }
    );

    if (
      !challenge.storageAggregator ||
      !challenge.opportunities ||
      !challenge.community
    ) {
      throw new EntityNotInitializedException(
        `Unable to load entities to create opportunity for challenge ${opportunityData.challengeID} `,
        LogContext.CHALLENGES
      );
    }

    await this.baseChallengeService.isNameAvailableInAccountOrFail(
      opportunityData.nameID,
      account.id
    );

    opportunityData.storageAggregatorParent = challenge.storageAggregator;
    opportunityData.level = challenge.level + 1;
    const opportunity = await this.opportunityService.createOpportunity(
      opportunityData,
      account,
      agentInfo
    );

    challenge.opportunities.push(opportunity);

    // Finally set the community relationship
    await this.baseChallengeService.setCommunityHierarchyForSubspace(
      challenge.community,
      opportunity.community
    );

    await this.challengeRepository.save(challenge);

    return opportunity;
  }

  public async getChallenges(
    options?: FindOneOptions<Challenge>
  ): Promise<IChallenge[]> {
    return this.challengeRepository.find(options);
  }

  async getChallengesInAccountCount(accountId: string): Promise<number> {
    const count = await this.challengeRepository.countBy({
      account: {
        id: accountId,
      },
      space: Not(IsNull()),
    });
    return count;
  }

  // Note: this is not strictly looking for opportunities within the current challenge, but within the account
  async getOpportunityInChallenge(
    opportunityID: string,
    challenge: IChallenge
  ): Promise<IOpportunity | null> {
    return await this.opportunityService.getOpportunityInAccount(
      opportunityID,
      challenge.account.id
    );
  }

  async getMetrics(challenge: IChallenge): Promise<INVP[]> {
    const metrics = await this.baseChallengeService.getMetrics(
      challenge,
      this.challengeRepository
    );

    // Opportunities
    const opportunitiesCount =
      await this.opportunityService.getOpportunitiesInChallengeCount(
        challenge.id
      );
    const opportunitiesTopic = new NVP(
      'opportunities',
      opportunitiesCount.toString()
    );
    opportunitiesTopic.id = `opportunities-${challenge.id}`;
    metrics.push(opportunitiesTopic);

    return metrics;
  }

  async getStorageAggregatorOrFail(
    challengeId: string
  ): Promise<IStorageAggregator> {
    return await this.baseChallengeService.getStorageAggregator(
      challengeId,
      this.challengeRepository
    );
  }

  async getChallengeForCommunity(
    communityID: string
  ): Promise<IChallenge | null> {
    return await this.challengeRepository.findOne({
      relations: { community: true },
      where: {
        community: { id: communityID },
      },
    });
  }
  public getSettings(challenge: IChallenge): ISpaceSettings {
    return this.baseChallengeService.getSettings(challenge);
  }
}
