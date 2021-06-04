import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { Organisation } from './organisation.entity';
import { OrganisationService } from './organisation.service';
import {
  ValidationException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganisation } from '@domain/community/organisation';
import { IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { IProfile } from '@domain/community/profile';
import { CurrentUser, Profiling } from '@common/decorators';
import { AgentInfo } from '@core/authentication';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
@Resolver(() => IOrganisation)
export class OrganisationResolverFields {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private organisationService: OrganisationService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('groups', () => [IUserGroup], {
    nullable: true,
    description: 'Groups defined on this organisation.',
  })
  @Profiling.api
  async groups(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() organisation: Organisation
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      organisation.authorization,
      `groups on Organisation: ${organisation.displayName}`
    );
    // get the organisation with the groups loaded
    const organisationGroups = await this.organisationService.getOrganisationOrFail(
      organisation.id,
      {
        relations: ['groups'],
      }
    );
    const groups = organisationGroups.groups;
    if (!groups)
      throw new ValidationException(
        `No groups on organisation: ${organisation.displayName}`,
        LogContext.COMMUNITY
      );
    return groups;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('members', () => [IUser], {
    nullable: true,
    description: 'All users that are members of this Organisation.',
  })
  @Profiling.api
  async members(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() organisation: Organisation
  ) {
    await this.authorizationEngine.grantReadAccessOrFail(
      agentInfo,
      organisation.authorization,
      `members on Organisation: ${organisation.displayName}`
    );

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
        `Profile not initialised on organisation: ${organisation.displayName}`,
        LogContext.COMMUNITY
      );
    }

    return organisation.profile;
  }
}
