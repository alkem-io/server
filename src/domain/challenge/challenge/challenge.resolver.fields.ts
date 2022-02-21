import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
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
import { IOrganization } from '@domain/community/organization/organization.interface';

@Resolver(() => IChallenge)
export class ChallengeResolverFields {
  constructor(private challengeService: ChallengeService) {}

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
  async opportunities(
    @Parent() challenge: Challenge,
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Opportunities to return; if omitted return all Opportunities.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Opportunities based on a random selection.',
      nullable: true,
    })
    shuffle: boolean
  ) {
    return await this.challengeService.getOpportunities(
      challenge.id,
      limit,
      shuffle
    );
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

  @ResolveField('agent', () => IAgent, {
    nullable: true,
    description: 'The Agent representing this Challenge.',
  })
  @Profiling.api
  async agent(@Parent() challenge: Challenge): Promise<IAgent> {
    return await this.challengeService.getAgent(challenge.id);
  }

  @ResolveField('activity', () => [INVP], {
    nullable: true,
    description: 'The activity within this Challenge.',
  })
  @Profiling.api
  async activity(@Parent() challenge: Challenge) {
    return await this.challengeService.getActivity(challenge);
  }

  @ResolveField('leadOrganizations', () => [IOrganization], {
    description: 'The Organizations that are leading this Challenge.',
  })
  @Profiling.api
  async leadOrganizations(@Parent() challenge: Challenge) {
    return await this.challengeService.getLeadOrganizations(challenge.id);
  }
}
