import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Roles } from '@src/core/authorization/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { Organisation } from './organisation.entity';
import { User } from '@domain/community/user/user.entity';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { Profiling } from '@src/core/logging/logging.profiling.decorator';
import { Profile } from '@domain/community/profile/profile.entity';
import { OrganisationService } from './organisation.service';
import {
  ValidationException,
  GroupNotInitializedException,
  EntityNotInitializedException,
} from '@src/common/error-handling/exceptions';
import { LogContext } from '@src/core/logging/logging.contexts';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver(() => Organisation)
export class OrganisationResolverFields {
  constructor(
    private organisationService: OrganisationService,
    private userGroupService: UserGroupService
  ) {}

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups defined on this organisation.',
  })
  @Profiling.api
  async groups(@Parent() organisation: Organisation) {
    const groups = await organisation.groups;
    if (!groups)
      throw new ValidationException(
        `No groups on organisation: ${organisation.name}`,
        LogContext.COMMUNITY
      );
    return groups;
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @ResolveField('members', () => [User], {
    nullable: true,
    description: 'Users that are contributing to this organisation.',
  })
  @Profiling.api
  async contributors(@Parent() organisation: Organisation) {
    const group = await this.userGroupService.getGroupByName(
      organisation,
      AuthorizationRoles.Members
    );
    if (!group)
      throw new GroupNotInitializedException(
        `Unable to locate members group on organisation: ${organisation.name}`,
        LogContext.COMMUNITY
      );
    const members = group.members;
    if (!members)
      throw new GroupNotInitializedException(
        `Members group not initialised on organisation: ${organisation.name}`,
        LogContext.COMMUNITY
      );
    return members;
  }

  @ResolveField('profile', () => Profile, {
    nullable: false,
    description: 'The profile for this organisation.',
  })
  @Profiling.api
  async profile(@Parent() organisation: Organisation) {
    const profile = organisation.profile;
    if (!profile) {
      throw new EntityNotInitializedException(
        `Profile not initialised on organisation: ${organisation.name}`,
        LogContext.COMMUNITY
      );
    }

    return organisation.profile;
  }
}
