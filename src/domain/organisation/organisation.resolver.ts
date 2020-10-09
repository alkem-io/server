import { Inject } from '@nestjs/common';
import { Mutation } from '@nestjs/graphql';
import { Float } from '@nestjs/graphql';
import { Args } from '@nestjs/graphql';
import { Resolver } from '@nestjs/graphql';
import { UserGroup } from '../user-group/user-group.entity';
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

  ///// Mutations /////
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

  @Mutation(() => Organisation)
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
