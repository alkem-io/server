import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { Organisation } from './organisation.entity';
import { User } from '@domain/community/user/user.entity';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { Profile } from '@domain/community/profile/profile.entity';
import { OrganisationService } from './organisation.service';
import {
  ValidationException,
  GroupNotInitializedException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';
@Resolver(() => Organisation)
export class OrganisationResolverFields {
  constructor(
    private organisationService: OrganisationService,
    private userGroupService: UserGroupService
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('groups', () => [UserGroup], {
    nullable: true,
    description: 'Groups defined on this organisation.',
  })
  @Profiling.api
  async groups(@Parent() organisation: Organisation) {
    // get the organisation with the groups loaded
    const organisationGroups = await this.organisationService.getOrganisationByIdOrFail(
      organisation.id,
      {
        relations: ['groups'],
      }
    );
    const groups = organisationGroups.groups;
    if (!groups)
      throw new ValidationException(
        `No groups on organisation: ${organisation.name}`,
        LogContext.COMMUNITY
      );
    return groups;
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Registered)
  @UseGuards(AuthorizationRulesGuard)
  @ResolveField('members', () => [User], {
    nullable: true,
    description: 'Users that are contributing to this organisation.',
  })
  @Profiling.api
  async contributors(@Parent() organisation: Organisation) {
    const group = await this.userGroupService.getGroupByName(
      organisation,
      AuthorizationRolesGlobal.Registered
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
