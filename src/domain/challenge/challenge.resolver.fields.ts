import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { Challenge } from './challenge.entity';
import { User } from '../user/user.entity';
import { UserGroupService } from '../user-group/user-group.service';
import { ChallengeService } from './challenge.service';
import { Opportunity } from '../opportunity/opportunity.entity';
import { Profiling } from '../../utils/logging/logging.profiling.decorator';
import { GroupNotInitializedException } from '../../utils/error-handling/exceptions';
import { LogContext } from '../../utils/logging/logging.contexts';

@Resolver(() => Challenge)
export class ChallengeResolverFields {
  constructor(
    private userGroupService: UserGroupService,
    private challengeService: ChallengeService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins,
    RestrictedGroupNames.Members
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to a challenge.',
  })
  @Profiling.api
  async groups(@Parent() challenge: Challenge) {
    const groups = await this.challengeService.loadGroups(challenge);
    return groups;
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

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins,
    RestrictedGroupNames.Members
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('contributors', () => [User], {
    nullable: true,
    description: 'All users that are contributing to this challenge.',
  })
  @Profiling.api
  async contributors(@Parent() challenge: Challenge) {
    const group = await this.challengeService.getMembersGroup(challenge);
    const members = group.members;
    if (!members)
      throw new GroupNotInitializedException(
        `Members group not initialised on challenge: ${challenge.name}`,
        LogContext.CHALLENGES
      );
    return members;
  }
}
