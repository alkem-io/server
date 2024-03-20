import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import {
  AuthorizationAgentPrivilege,
  CurrentUser,
} from '@src/common/decorators';
import { ChallengeService } from './challenge.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { IAgent } from '@domain/agent/agent';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Loader } from '@core/dataloader/decorators';
import {
  JourneyCollaborationLoaderCreator,
  JourneyCommunityLoaderCreator,
  JourneyContextLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { UUID_NAMEID } from '@domain/common/scalars/scalar.uuid.nameid';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(
    private challengeService: ChallengeService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  async community(
    @Parent() challenge: IChallenge,
    @Loader(JourneyCommunityLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<ICommunity>
  ): Promise<ICommunity> {
    const community = await loader.load(challenge.id);
    // Do not check for READ access here, rely on per field check on resolver in Community
    // await this.authorizationService.grantAccessOrFail(
    //   agentInfo,
    //   community.authorization,
    //   AuthorizationPrivilege.READ,
    //   `read community on space: ${community.id}`
    // );
    return community;
  }

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the challenge.',
  })
  async context(
    @Parent() challenge: IChallenge,
    @Loader(JourneyContextLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<IContext>
  ): Promise<IContext> {
    const context = await loader.load(challenge.id);
    // Do not check for READ access here, rely on per field check on resolver in Community
    // await this.authorizationService.grantAccessOrFail(
    //   agentInfo,
    //   community.authorization,
    //   AuthorizationPrivilege.READ,
    //   `read community on space: ${community.id}`
    // );
    return context;
  }

  //@AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the challenge.',
  })
  async collaboration(
    @Parent() challenge: IChallenge,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<ICollaboration>
  ): Promise<ICollaboration> {
    const collaboration = await loader.load(challenge.id);
    return collaboration;
  }

  // Check authorization inside the field resolver
  @UseGuards(GraphqlGuard)
  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the  Challenge.',
  })
  async profile(
    @Parent() challenge: IChallenge,
    @CurrentUser() agentInfo: AgentInfo,
    @Loader(ProfileLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<IProfile>
  ): Promise<IProfile> {
    const profile = await loader.load(challenge.id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      profile.authorization,
      AuthorizationPrivilege.READ,
      `read profile on challenge: ${profile.displayName}`
    );
    return profile;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description: 'The StorageAggregator in use by this Challenge',
  })
  async storageAggregator(
    @Parent() challenge: Challenge
  ): Promise<IStorageAggregator> {
    return await this.challengeService.getStorageAggregatorOrFail(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: true,
    description: 'The Opportunities for the challenge.',
  })
  async opportunities(
    @Parent() challenge: IChallenge,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ): Promise<IOpportunity[]> {
    return await this.challengeService.getOpportunities(challenge.id, args);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('opportunity', () => IOpportunity, {
    nullable: false,
    description:
      'A particular Opportunity, either by its ID or nameID, in the same account as the parent Challenge',
  })
  async opportunity(
    @Args('ID', { type: () => UUID_NAMEID }) id: string,
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() challenge: IChallenge
  ): Promise<IOpportunity> {
    const opportunity = await this.challengeService.getOpportunityInChallenge(
      id,
      challenge
    );
    if (!opportunity) {
      throw new EntityNotFoundException(
        `Unable to find Opportunity with ID: '${id}'`,
        LogContext.CHALLENGES,
        {
          opportunityId: id,
          challengeId: challenge.id,
          userId: agentInfo.userID,
        }
      );
    }
    return opportunity;
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Challenge.',
  })
  async agent(
    @Parent() challenge: IChallenge,
    @Loader(AgentLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(challenge.id);
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about activity within this Challenge.',
  })
  async metrics(@Parent() challenge: IChallenge) {
    return await this.challengeService.getMetrics(challenge);
  }

  @ResolveField('settings', () => ISpaceSettings, {
    nullable: false,
    description: 'The settings for this Space.',
  })
  states(@Parent() challenge: IChallenge): ISpaceSettings {
    return this.challengeService.getSettings(challenge);
  }
}
