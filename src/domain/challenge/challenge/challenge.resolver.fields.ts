import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
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

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(private challengeService: ChallengeService) {}

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

  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the challenge.',
  })
  async context(
    @Parent() challenge: IChallenge,
    @Loader(JourneyContextLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<IContext>
  ) {
    return loader.load(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('collaboration', () => ICollaboration, {
    nullable: true,
    description: 'The collaboration for the challenge.',
  })
  @Profiling.api
  async collaboration(
    @Parent() challenge: IChallenge,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<ICollaboration>
  ) {
    return loader.load(challenge.id);
  }

  @ResolveField('profile', () => IProfile, {
    nullable: false,
    description: 'The Profile for the  Challenge.',
  })
  @Profiling.api
  async profile(
    @Parent() challenge: IChallenge,
    @Loader(ProfileLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<IProfile>
  ) {
    return loader.load(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('storageAggregator', () => IStorageAggregator, {
    nullable: true,
    description: 'The StorageAggregator in use by this Challenge',
  })
  @UseGuards(GraphqlGuard)
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
  @Profiling.api
  async opportunities(
    @Parent() challenge: IChallenge,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ) {
    return await this.challengeService.getOpportunities(challenge.id, args);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The set of child Challenges within this challenge.',
  })
  @Profiling.api
  async challenges(@Parent() challenge: IChallenge) {
    return await this.challengeService.getChildChallenges(challenge);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Challenge.',
  })
  @Profiling.api
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
  @Profiling.api
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
