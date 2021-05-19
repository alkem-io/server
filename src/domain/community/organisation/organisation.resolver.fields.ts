import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Organisation } from './organisation.entity';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import { OrganisationService } from './organisation.service';
import {
  ValidationException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { AuthorizationRoleGlobal, LogContext } from '@common/enums';
import {
  GraphqlGuard,
  AuthorizationOrganisationMember,
} from '@core/authorization';
import { IOrganisation } from '@domain/community/organisation';
import { IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { IProfile } from '@domain/community/profile';
@Resolver(() => IOrganisation)
export class OrganisationResolverFields {
  constructor(
    private organisationService: OrganisationService,
    private userGroupService: UserGroupService
  ) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.Admin,
    AuthorizationRoleGlobal.CommunityAdmin
  )
  @AuthorizationOrganisationMember()
  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
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

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.Admin,
    AuthorizationRoleGlobal.CommunityAdmin
  )
  @AuthorizationOrganisationMember()
  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are members of this Organisation.',
  })
  @Profiling.api
  async members(@Parent() organisation: Organisation) {
    return await this.organisationService.getMembers(organisation);
  }

  @ResolveField('profile', () => IProfile, {
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
