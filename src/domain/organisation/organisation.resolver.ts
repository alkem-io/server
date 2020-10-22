import { Inject, UseGuards } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { Float } from '@nestjs/graphql';
import { Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { Roles } from '../../utils/decorators/roles.decorator';
import { GqlAuthGuard } from '../../utils/authentication/graphql.guard';
import {
  RestrictedGroupNames,
  UserGroup,
} from '../user-group/user-group.entity';
import { IUserGroup } from '../user-group/user-group.interface';
import { OrganisationInput } from './organisation.dto';
import { Organisation } from './organisation.entity';
import { IOrganisation } from './organisation.interface';
import { OrganisationService } from './organisation.service';

@Resolver()
export class OrganisationResolver {
  constructor(
    @Inject(OrganisationService)
    private organisationService: OrganisationService
  ) {}

  @Roles(
    RestrictedGroupNames.CommunityAdmins,
    RestrictedGroupNames.EcoverseAdmins
  )
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Creates a new user group for the organisation with the given id',
  })
  async createGroupOnOrganisation(
    @Args({ name: 'orgID', type: () => Float }) orgID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.organisationService.createGroup(orgID, groupName);
    return group;
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Organisation, {
    description: 'Updates the organisation with the given data',
  })
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
