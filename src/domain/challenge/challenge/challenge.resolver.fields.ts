import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { ILifecycle } from '@domain/common/lifecycle';
import { IChallenge } from '@domain/challenge/challenge';
import { INVP } from '@domain/common/nvp';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AuthorizationPrivilege } from '@common/enums';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private challengeService: ChallengeService
  ) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('community', () => ICommunity, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community(@Parent() challenge: Challenge) {
    return await this.challengeService.getCommunity(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('context', () => IContext, {
    nullable: true,
    description: 'The context for the challenge.',
  })
  @Profiling.api
  async context(@Parent() challenge: Challenge) {
    return await this.challengeService.getContext(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('opportunities', () => [IOpportunity], {
    nullable: true,
    description: 'The Opportunities for the challenge.',
  })
  @Profiling.api
  async opportunities(@Parent() challenge: Challenge) {
    return await this.challengeService.getOpportunities(challenge.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('lifecycle', () => ILifecycle, {
    nullable: true,
    description: 'The lifeycle for the Challenge.',
  })
  @Profiling.api
  async lifecycle(@Parent() challenge: Challenge) {
    return await this.challengeService.getLifecycle(challenge.id);
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

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Challenge.',
  })
  @Profiling.api
  async activity(@Parent() challenge: Challenge) {
    return await this.challengeService.getActivity(challenge);
  }
}
