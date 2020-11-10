import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { User } from '../user/user.entity';
import { UserGroupService } from '../user-group/user-group.service';
import { Opportunity } from './opportunity.entity';
import { Profiling } from '../../utils/logging/logging.profiling.decorator';
import { OpportunityService } from './opportunity.service';

@Resolver(() => Opportunity)
export class OpportunityResolverFields {
  constructor(
    private userGroupService: UserGroupService,
    private opportunityService: OpportunityService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups of users related to a Opportunity.',
  })
  @Profiling.api
  async groups(@Parent() opportunity: Opportunity) {
    const groups = await this.opportunityService.loadGroups(opportunity);
    return groups;
  }

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @ResolveField('contributors', () => [User], {
    nullable: true,
    description: 'All users that are contributing to this Opportunity.',
  })
  @Profiling.api
  async contributors(@Parent() opportunity: Opportunity) {
    const group = await this.userGroupService.getGroupByName(
      opportunity,
      RestrictedGroupNames.Members
    );
    if (!group)
      throw new Error(
        `Unable to locate members group on Opportunity: ${Opportunity.name}`
      );
    const members = group.members;
    if (!members)
      throw new Error(
        `Members group not initialised on Opportunity: ${Opportunity.name}`
      );
    return members;
  }
}
