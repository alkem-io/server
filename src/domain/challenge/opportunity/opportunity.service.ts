import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { EntityNotFoundException } from '@common/exceptions';
import {
  CreateOpportunityInput,
  IOpportunity,
  Opportunity,
  UpdateOpportunityInput,
} from '@domain/challenge/opportunity';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { BaseChallengeService } from '@domain/challenge/base-challenge/base.challenge.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { CommunityService } from '@domain/community/community/community.service';
import { NVP } from '@domain/common/nvp';
import { UUID_LENGTH } from '@common/constants';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { IContext } from '@domain/context/context/context.interface';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { IAccount } from '../account/account.interface';
import { SpaceType } from '@common/enums/space.type';
@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private communityService: CommunityService,
    private namingService: NamingService,
    @InjectRepository(Opportunity)
    private opportunityRepository: Repository<Opportunity>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  async createOpportunity(
    opportunityData: CreateOpportunityInput,
    account: IAccount,
    agentInfo?: AgentInfo
  ): Promise<IOpportunity> {
    if (!opportunityData.nameID) {
      opportunityData.nameID = this.namingService.createNameID(
        opportunityData.profileData?.displayName || ''
      );
    }
    await this.baseChallengeService.isNameAvailableInAccountOrFail(
      opportunityData.nameID,
      account.id
    );

    const opportunity: IOpportunity = Opportunity.create(opportunityData);
    opportunity.type = SpaceType.OPPORTUNITY;
    opportunity.account = account;

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      account,
      agentInfo
    );

    return await this.saveOpportunity(opportunity);
  }

  async save(opportunity: IOpportunity): Promise<IOpportunity> {
    return await this.opportunityRepository.save(opportunity);
  }

  async getOpportunityInAccount(
    opportunityID: string,
    accountID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity | null> {
    let opportunity: IOpportunity | null = null;
    if (opportunityID.length == UUID_LENGTH) {
      opportunity = await this.opportunityRepository.findOne({
        where: {
          id: opportunityID,
          account: {
            id: accountID,
          },
        },
        ...options,
      });
    }
    if (!opportunity) {
      // look up based on nameID
      opportunity = await this.opportunityRepository.findOne({
        where: {
          nameID: opportunityID,
          account: {
            id: accountID,
          },
        },
        ...options,
      });
    }

    return opportunity;
  }

  async getOpportunityOrFail(
    opportunityID: string,
    options?: FindOneOptions<Opportunity>
  ): Promise<IOpportunity | never> {
    let opportunity: IOpportunity | null = null;
    if (opportunityID.length == UUID_LENGTH) {
      opportunity = await this.opportunityRepository.findOne({
        where: {
          id: opportunityID,
        },
        ...options,
      });
    }

    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: ${opportunityID}`,
        LogContext.OPPORTUNITY
      );
    }

    return opportunity;
  }

  async deleteOpportunity(opportunityID: string): Promise<IOpportunity> {
    const opportunity = await this.getOpportunityOrFail(opportunityID);

    await this.baseChallengeService.deleteEntities(
      opportunity.id,
      this.opportunityRepository
    );

    const result = await this.opportunityRepository.remove(
      opportunity as Opportunity
    );
    result.id = opportunityID;
    return result;
  }

  async updateOpportunity(
    opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    await this.baseChallengeService.update(
      opportunityData,
      this.opportunityRepository
    );

    return await this.getOpportunityOrFail(opportunityData.ID);
  }

  async saveOpportunity(opportunity: IOpportunity): Promise<IOpportunity> {
    return await this.opportunityRepository.save(opportunity);
  }

  async getCommunity(opportunityId: string): Promise<ICommunity> {
    return await this.baseChallengeService.getCommunity(
      opportunityId,
      this.opportunityRepository
    );
  }

  public async getAccountOrFail(opportunityId: string): Promise<IAccount> {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id: opportunityId },
      relations: {
        account: true,
      },
    });

    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find opportunity with ID: ${opportunityId}`,
        LogContext.CHALLENGES
      );
    }

    return opportunity.account;
  }

  async getContext(opportunityId: string): Promise<IContext> {
    return await this.baseChallengeService.getContext(
      opportunityId,
      this.opportunityRepository
    );
  }

  async getProfile(opportunity: IOpportunity): Promise<IProfile> {
    return await this.baseChallengeService.getProfile(
      opportunity.id,
      this.opportunityRepository
    );
  }

  public async getCollaboration(
    opportunity: IOpportunity
  ): Promise<ICollaboration> {
    return await this.baseChallengeService.getCollaborationOrFail(
      opportunity.id,
      this.opportunityRepository
    );
  }

  async getStorageAggregatorOrFail(
    opportunityId: string
  ): Promise<IStorageAggregator> {
    return await this.baseChallengeService.getStorageAggregator(
      opportunityId,
      this.opportunityRepository
    );
  }

  async getMetrics(opportunity: IOpportunity): Promise<INVP[]> {
    const metrics: INVP[] = [];
    const community = await this.getCommunity(opportunity.id);

    // Members
    const membersCount = await this.communityService.getMembersCount(community);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${opportunity.id}`;
    metrics.push(membersTopic);

    // Posts
    const postsCount = await this.baseChallengeService.getPostsCount(
      opportunity,
      this.opportunityRepository
    );
    const postsTopic = new NVP('posts', postsCount.toString());
    postsTopic.id = `posts-${opportunity.id}`;
    metrics.push(postsTopic);

    // Whiteboards
    const whiteboardsCount =
      await this.baseChallengeService.getWhiteboardsCount(
        opportunity,
        this.opportunityRepository
      );
    const whiteboardsTopic = new NVP(
      'whiteboards',
      whiteboardsCount.toString()
    );
    whiteboardsTopic.id = `whiteboards-${opportunity.id}`;
    metrics.push(whiteboardsTopic);

    return metrics;
  }

  async getOpportunitiesInAccountCount(accountID: string): Promise<number> {
    return await this.opportunityRepository.countBy({
      account: {
        id: accountID,
      },
    });
  }

  async getOpportunitiesInChallengeCount(challengeID: string): Promise<number> {
    return await this.opportunityRepository.countBy({
      challenge: { id: challengeID },
    });
  }

  async getOpportunityForCommunity(
    communityID: string
  ): Promise<IOpportunity | null> {
    return await this.opportunityRepository.findOne({
      relations: { community: true, challenge: true },
      where: {
        community: { id: communityID },
      },
    });
  }

  async getCommunityPolicy(opportunityID: string): Promise<ICommunityPolicy> {
    return await this.baseChallengeService.getCommunityPolicy(
      opportunityID,
      this.opportunityRepository
    );
  }
}
