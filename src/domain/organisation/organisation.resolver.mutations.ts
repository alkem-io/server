import { Inject, UseGuards } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { Float } from '@nestjs/graphql';
import { Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Roles } from '@utils/authorisation/roles.decorator';
import { GqlAuthGuard } from '@utils/authorisation/graphql.guard';
import { UserGroup } from '@domain/user-group/user-group.entity';
import { IUserGroup } from '@domain/user-group/user-group.interface';
import { OrganisationInput } from './organisation.dto';
import { Organisation } from './organisation.entity';
import { IOrganisation } from './organisation.interface';
import { OrganisationService } from './organisation.service';
import { Profiling } from '@utils/logging/logging.profiling.decorator';
import { AuthorisationRoles } from '@utils/authorisation/authorisation.roles';

@Resolver(() => Organisation)
export class OrganisationResolverMutations {
  constructor(
    @Inject(OrganisationService)
    private organisationService: OrganisationService
  ) {}

  @Roles(AuthorisationRoles.CommunityAdmins, AuthorisationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Creates a new user group for the organisation with the given id',
  })
  @Profiling.api
  async createGroupOnOrganisation(
    @Args({ name: 'orgID', type: () => Float }) orgID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.organisationService.createGroup(orgID, groupName);
    return group;
  }

  @Roles(AuthorisationRoles.CommunityAdmins, AuthorisationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Organisation, {
    description: 'Updates the organisation with the given data',
  })
  @Profiling.api
  async updateOrganisation(
    @Args('orgID') orgID: number,
    @Args('organisationData') organisationData: OrganisationInput
  ): Promise<IOrganisation> {
    const org = await this.organisationService.updateOrganisation(
      orgID,
      organisationData
    );
    return org;
  }
}
