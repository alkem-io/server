import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';
import { Community } from '@domain/community/community';
import { Lifecycle } from '@domain/common/lifecycle/lifecycle.entity';
import { Context } from '@domain/context/context';
import { Opportunity } from '@domain/collaboration/opportunity';
import { NVP } from '@domain/common';
import { IChallenge } from '@domain/challenge';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(private challengeService: ChallengeService) {}

  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community(@Parent() challenge: Challenge) {
    return await this.challengeService.getCommunity(challenge.id);
  }

  @ResolveField('context', () => Context, {
    nullable: true,
    description: 'The context for the challenge.',
  })
  @Profiling.api
  async context(@Parent() challenge: Challenge) {
    return await this.challengeService.getContext(challenge.id);
  }

  @ResolveField('opportunites', () => [Opportunity], {
    nullable: true,
    description: 'The Opportunities for the challenge.',
  })
  @Profiling.api
  async opportunities(@Parent() challenge: Challenge) {
    return await this.challengeService.getOpportunities(challenge.id);
  }

  @ResolveField('lifecycle', () => Lifecycle, {
    nullable: true,
    description: 'The lifeycle for the Challenge.',
  })
  @Profiling.api
  async lifecycle(@Parent() challenge: Challenge) {
    return await this.challengeService.getLifecycle(challenge.id);
  }

  @ResolveField('challenges', () => [IChallenge], {
    nullable: true,
    description: 'The set of child Challenges within this challenge.',
  })
  @Profiling.api
  async challenges(@Parent() challenge: Challenge) {
    return await this.challengeService.getChildChallenges(challenge);
  }

  @ResolveField('activity', () => [NVP], {
    nullable: true,
    description: 'The activity within this Challenge.',
  })
  @Profiling.api
  async activity(@Parent() challenge: Challenge) {
    return await this.challengeService.getActivity(challenge);
  }
}
