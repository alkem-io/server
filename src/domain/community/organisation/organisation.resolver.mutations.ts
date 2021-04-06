import { Inject, UseGuards } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { Float } from '@nestjs/graphql';
import { Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { CreateOrganisationInput } from './organisation.dto.create';
import { Organisation } from './organisation.entity';
import { IOrganisation } from './organisation.interface';
import { OrganisationService } from './organisation.service';
import { Profiling } from '@src/common/decorators';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { UpdateOrganisationInput } from './organisation.dto.update';

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
    @Args({ name: 'orgID', type: () => Float }) orgID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.organisationService.createGroup(orgID, groupName);
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
}
