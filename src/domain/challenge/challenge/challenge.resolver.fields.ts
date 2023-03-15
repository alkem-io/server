import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { IContext } from '@domain/context/context/context.interface';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
import { ILifecycle } from '@domain/common/lifecycle/lifecycle.interface';
import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { IAgent } from '@domain/agent/agent';
import { IPreference } from '@domain/common/preference';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { Loader } from '@core/dataloader/decorators';
import {
  JourneyAgentLoaderCreator,
  JourneyCollaborationLoaderCreator,
  JourneyCommunityLoaderCreator,
  JourneyLifecycleLoaderCreator,
  JourneyContextLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { ILoader } from '@core/dataloader/loader.interface';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(
    private challengeService: ChallengeService,
    private preferenceSetService: PreferenceSetService
  ) {}

  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community(
    @Parent() challenge: Challenge,
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
    @Parent() challenge: Challenge,
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
    @Parent() challenge: Challenge,
    @Loader(JourneyCollaborationLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<ICollaboration>
  ) {
    return loader.load(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: true,
    description: 'The Opportunities for the challenge.',
  })
  @Profiling.api
  async opportunities(
    @Parent() challenge: Challenge,
    @Args({ nullable: true }) args: LimitAndShuffleIdsQueryArgs
  ) {
    return await this.challengeService.getOpportunities(challenge.id, args);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The lifecycle for the Challenge.',
  })
  @Profiling.api
  async lifecycle(
    @Parent() challenge: Challenge,
    @Loader(JourneyLifecycleLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<ILifecycle>
  ) {
    return loader.load(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The set of child Challenges within this challenge.',
  })
  @Profiling.api
  async challenges(@Parent() challenge: Challenge) {
    return await this.challengeService.getChildChallenges(challenge);
  }

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Challenge.',
  })
  @Profiling.api
  async agent(
    @Parent() challenge: Challenge,
    @Loader(JourneyAgentLoaderCreator, { parentClassRef: Challenge })
    loader: ILoader<IAgent>
  ): Promise<IAgent> {
    return loader.load(challenge.id);
  }

  @ResolveField('metrics', () => [INVP], {
    nullable: true,
    description: 'Metrics about activity within this Challenge.',
  })
  @Profiling.api
  async metrics(@Parent() challenge: Challenge) {
    return await this.challengeService.getMetrics(challenge);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('preferences', () => [IPreference], {
    nullable: false,
    description: 'The preferences for this Challenge',
  })
  @UseGuards(GraphqlGuard)
  async preferences(@Parent() challenge: Challenge): Promise<IPreference[]> {
    const preferenceSet = await this.challengeService.getPreferenceSetOrFail(
      challenge.id
    );
    return this.preferenceSetService.getPreferencesOrFail(preferenceSet);
  }
}
