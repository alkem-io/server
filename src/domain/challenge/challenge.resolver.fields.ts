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

@Resolver(() => Challenge)
export class ChallengeResolverFields {
  constructor(private userGroupService: UserGroupService) {}

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
    const groups = await challenge.groups;
    if (!groups) throw new Error(`No groups on challenge: ${challenge.name}`);
    return groups;
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
