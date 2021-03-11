import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Profiling } from '@src/common/decorators';
import { Challenge } from './challenge.entity';
import { ChallengeService } from './challenge.service';
import { Community } from '@domain/community/community';

@Resolver(() => Challenge)
export class ChallengeResolverFields {
  constructor(
    private userGroupService: UserGroupService,
    private challengeService: ChallengeService
  ) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('community', () => Community, {
    nullable: true,
    description: 'The community for the challenge.',
  })
  @Profiling.api
  async community(@Parent() challenge: Challenge) {
    const community = await this.challengeService.loadCommunity(challenge.id);
    return community;
  }

  @ResolveField('opportunities', () => [Opportunity], {
    nullable: true,
    description: 'The set of opportunities within this challenge.',
  })
  @Profiling.api
  async opportunities(@Parent() challenge: Challenge) {
    const opportunities = await this.challengeService.loadOpportunities(
      challenge
    );
    return opportunities;
  }
}
