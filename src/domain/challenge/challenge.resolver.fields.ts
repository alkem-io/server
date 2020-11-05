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

@Resolver(() => Challenge)
export class ChallengeResolverFields {
  constructor(
    private userGroupService: UserGroupService,
    private challengeService: ChallengeService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to a challenge.',
  })
  async groups(@Parent() challenge: Challenge) {
    const groups = await this.challengeService.loadGroups(challenge);
    return groups;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('opportunities', () => [Opportunity], {
    nullable: true,
    description: 'The set of opportunities within this challenge.',
  })
  async opportunities(@Parent() challenge: Challenge) {
    const opportunities = await this.challengeService.loadOpportunities(
      challenge
    );
    return opportunities;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('contributors', () => [User], {
    nullable: true,
    description: 'All users that are contributing to this challenge.',
  })
  async contributors(@Parent() challenge: Challenge) {
    const group = await this.userGroupService.getGroupByName(
      challenge,
      RestrictedGroupNames.Members
    );
    if (!group)
      throw new Error(
        `Unable to locate members group on challenge: ${challenge.name}`
      );
    const members = group.members;
    if (!members)
      throw new Error(
        `Members group not initialised on challenge: ${challenge.name}`
      );
    return members;
  }
}
