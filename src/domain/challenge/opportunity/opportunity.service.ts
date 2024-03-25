import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import {
  CreateOpportunityInput,
  IOpportunity,
  Opportunity,
  opportunityCommunityApplicationForm,
  opportunityCommunityPolicy,
  UpdateOpportunityInput,
} from '@domain/challenge/opportunity';
import { LogContext, ProfileType } from '@common/enums';
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
import { CommunityRole } from '@common/enums/community.role';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { opportunityDefaultCallouts } from './opportunity.default.callouts';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { IAccount } from '../account/account.interface';
import { SpaceType } from '@common/enums/space.type';
import { CalloutGroupName } from '@common/enums/callout.group.name';
@Injectable()
export class OpportunityService {
  constructor(
    private baseChallengeService: BaseChallengeService,
    private communityService: CommunityService,
    private collaborationService: CollaborationService,
    private storageAggregatorService: StorageAggregatorService,
    private spaceDefaultsService: SpaceDefaultsService,
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

    opportunity.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        opportunityData.storageAggregatorParent
      );

    await this.baseChallengeService.initialise(
      opportunity,
      opportunityData,
      account,
      SpaceType.OPPORTUNITY,
      opportunityCommunityPolicy,
      opportunityCommunityApplicationForm,
      ProfileType.OPPORTUNITY,
      opportunity.storageAggregator,
      opportunityData.collaborationData
    );

    await this.opportunityRepository.save(opportunity);

    if (opportunity.collaboration) {
      await this.collaborationService.addCalloutGroupTagsetTemplate(
        opportunity.collaboration,
        CalloutGroupName.CONTRIBUTE_2
      );

      // Finally create default callouts, using the defaults service to decide what to add
      const calloutInputsFromCollaborationTemplate =
        await this.collaborationService.createCalloutInputsFromCollaborationTemplate(
          opportunityData.collaborationData?.collaborationTemplateID
        );
      const calloutInputs =
        await this.spaceDefaultsService.getCreateCalloutInputs(
          opportunityDefaultCallouts,
          calloutInputsFromCollaborationTemplate,
          opportunityData.collaborationData
        );

      opportunity.collaboration =
        await this.collaborationService.addDefaultCallouts(
          opportunity.collaboration,
          calloutInputs,
          opportunity.storageAggregator,
          agentInfo?.userID
        );
    }

    // set immediate community parent
    if (opportunity.community) {
      opportunity.community.parentID = opportunity.id;
      opportunity.community.policy =
        await this.communityService.updateCommunityPolicyResourceID(
          opportunity.community,
          opportunity.id
        );
    }

    if (agentInfo && opportunity.community) {
      await this.communityService.assignUserToRole(
        opportunity.community,
        agentInfo.userID,
        CommunityRole.MEMBER
      );

      await this.communityService.assignUserToRole(
        opportunity.community,
        agentInfo.userID,
        CommunityRole.LEAD
      );

      await this.communityService.assignUserToRole(
        opportunity.community,
        agentInfo.userID,
        CommunityRole.ADMIN
      );
    }

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
    const opportunity = await this.getOpportunityOrFail(opportunityID, {
      relations: {
        storageAggregator: true,
      },
    });

    await this.baseChallengeService.deleteEntities(
      opportunity.id,
      this.opportunityRepository
    );

    if (opportunity.storageAggregator) {
      await this.storageAggregatorService.delete(
        opportunity.storageAggregator.id
      );
    }

    const result = await this.opportunityRepository.remove(
      opportunity as Opportunity
    );
    result.id = opportunityID;
    return result;
  }

  async updateOpportunity(
    opportunityData: UpdateOpportunityInput
  ): Promise<IOpportunity> {
    const baseOpportunity = await this.baseChallengeService.update(
      opportunityData,
      this.opportunityRepository
    );
    const opportunity = await this.getOpportunityOrFail(baseOpportunity.id, {
      relations: { profile: true, account: true },
    });
    if (!opportunity.account) {
      throw new EntityNotInitializedException(
        `Opportunity account not set: ${opportunity.id}`,
        LogContext.CHALLENGES
      );
    }
    if (opportunityData.nameID) {
      if (opportunityData.nameID !== baseOpportunity.nameID) {
        // updating the nameID, check new value is allowed
        await this.baseChallengeService.isNameAvailableInAccountOrFail(
          opportunityData.nameID,
          opportunity.account.id
        );
        baseOpportunity.nameID = opportunityData.nameID;
        await this.opportunityRepository.save(baseOpportunity);
      }
    }
    return opportunity;
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
