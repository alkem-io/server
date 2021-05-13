import { Inject, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { OrganisationService } from './organisation.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
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
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';

@Resolver(() => Organisation)
export class OrganisationResolverMutations {
  constructor(
    @Inject(OrganisationService)
    private organisationService: OrganisationService
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Organisation, {
    description: 'Creates a new Organisation on the platform.',
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

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => UserGroup, {
    description: 'Creates a new User Group for the specified Organisation.',
  })
  @Profiling.api
  async createGroupOnOrganisation(
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const group = await this.organisationService.createGroup(groupData);
    return group;
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => Organisation, {
    description: 'Updates the specified Organisation.',
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

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Organisation, {
    description: 'Deletes the specified Organisation.',
  })
  async deleteOrganisation(
    @Args('deleteData') deleteData: DeleteOrganisationInput
  ): Promise<IOrganisation> {
    return await this.organisationService.deleteOrganisation(deleteData);
  }
}
