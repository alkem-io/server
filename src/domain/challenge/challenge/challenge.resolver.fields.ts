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
import { AuthorizationPrivilege } from '@common/enums';
import { IAgent } from '@domain/agent/agent';
import { IPreference } from '@domain/common/preference';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { IProfile } from '@domain/common/profile/profile.interface';
import { Loader } from '@core/dataloader/decorators';
import {
  JourneyCollaborationLoaderCreator,
  JourneyCommunityLoaderCreator,
  JourneyContextLoaderCreator,
  PreferencesLoaderCreator,
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators';
import { ILoader } from '@core/dataloader/loader.interface';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(
    private challengeService: ChallengeService,
    private authorizationService: AuthorizationService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  async community(
    @Parent() challenge: IChallenge,
    @Loader(JourneyCommunityLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<ICommunity>
  ) {
    return loader.load(challenge.id);
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
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
    return loader.load(challenge.id);
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this Challenge',
  })
  async preferences(
    @Parent() challenge: IChallenge,
    @Loader(PreferencesLoaderCreator, {
      parentClassRef: Challenge,
      getResult: r => r?.preferenceSet?.preferences,
    })
    loader: ILoader<IPreference[]>
  ): Promise<IPreference[]> {
    return loader.load(challenge.id);
  }
}
