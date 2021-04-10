import { Inject, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { OrganisationService } from './organisation.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import {
  CreateOrganisationInput,
  UpdateOrganisationInput,
  Organisation,
  IOrganisation,
  DeleteOrganisationInput,
} from '@domain/community/organisation';
import {
  CreateUserGroupInput,
  IUserGroup,
  UserGroup,
} from '@domain/community/user-group';

@Resolver(() => Organisation)
export class OrganisationResolverMutations {
  constructor(
    @Inject(OrganisationService)
    private organisationService: OrganisationService
  ) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Organisation, {
    description:
      'Creates a new organisation and registers it with the ecoverse',
  })
  @Profiling.api
  async createOrganisation(
    @Args('organisationData') organisationData: CreateOrganisationInput
  ): Promise<IOrganisation> {
    const organisation = await this.organisationService.createOrganisation(
      organisationData
    );

    return organisation;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Creates a new user group for the organisation with the given id',
  })
  @Profiling.api
  async createGroupOnOrganisation(
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.organisationService.createGroup(groupData);
    return group;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Organisation, {
    description: 'Updates the organisation with the given data',
  })
  @Profiling.api
  async updateOrganisation(
    @Args('organisationData') organisationData: UpdateOrganisationInput
  ): Promise<IOrganisation> {
    const org = await this.organisationService.updateOrganisation(
      organisationData
    );
    return org;
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Organisation, {
    description: 'Removes the Organisaiton with the specified ID',
  })
  async deleteOrganisation(
    @Args('deleteData') deleteData: DeleteOrganisationInput
  ): Promise<IOrganisation> {
    return await this.organisationService.deleteOrganisation(deleteData);
  }
}
