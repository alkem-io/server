import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { OrganisationService } from './organisation.service';
import {
  AuthorizationGlobalRoles,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import {
  CreateOrganisationInput,
  UpdateOrganisationInput,
  IOrganisation,
  DeleteOrganisationInput,
} from '@domain/community/organisation';
import { CreateUserGroupInput, IUserGroup } from '@domain/community/user-group';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { OrganisationAuthorizationService } from './organisation.service.authorization';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication/agent-info';

@Resolver(() => IOrganisation)
export class OrganisationResolverMutations {
  constructor(
    private organisationAuthorizationService: OrganisationAuthorizationService,
    private organisationService: OrganisationService,
    private authorizationEngine: AuthorizationEngineService
  ) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganisation, {
    description: 'Creates a new Organisation on the platform.',
  })
  @Profiling.api
  async createOrganisation(
    @Args('organisationData') organisationData: CreateOrganisationInput
  ): Promise<IOrganisation> {
    const organisation = await this.organisationService.createOrganisation(
      organisationData
    );

    return await this.organisationAuthorizationService.applyAuthorizationRules(
      organisation
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group for the specified Organisation.',
  })
  @Profiling.api
  async createGroupOnOrganisation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const organisation = await this.organisationService.getOrganisationOrFail(
      groupData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      organisation.authorization,
      AuthorizationPrivilege.CREATE,
      `orgCreateGroup: ${organisation.nameID}`
    );

    return await this.organisationService.createGroup(groupData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganisation, {
    description: 'Updates the specified Organisation.',
  })
  @Profiling.api
  async updateOrganisation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('organisationData') organisationData: UpdateOrganisationInput
  ): Promise<IOrganisation> {
    const organisation = await this.organisationService.getOrganisationOrFail(
      organisationData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      organisation.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${organisation.nameID}`
    );

    return await this.organisationService.updateOrganisation(organisationData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganisation, {
    description: 'Deletes the specified Organisation.',
  })
  async deleteOrganisation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteOrganisationInput
  ): Promise<IOrganisation> {
    const organisation = await this.organisationService.getOrganisationOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      organisation.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${organisation.nameID}`
    );
    return await this.organisationService.deleteOrganisation(deleteData);
  }
}
