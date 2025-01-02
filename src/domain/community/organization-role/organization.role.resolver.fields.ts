import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Parent, ResolveField } from '@nestjs/graphql';
import { OrganizationRoleService } from './organization.role.service';
import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganization, Organization } from '@domain/community/organization';
import { IUser } from '@domain/community/user/user.interface';
import { CurrentUser, Profiling } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationRole } from '@common/enums/organization.role';
import { OrganizationLookupService } from '../organization-lookup/organization.lookup.service';

@Resolver(() => IOrganization)
export class OrganizationRoleResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private organizationLookupService: OrganizationLookupService,
    private organizationRoleService: OrganizationRoleService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField('associates', () => [IUser], {
    nullable: true,
    description: 'All Users that are associated with this Organization.',
  })
  @Profiling.api
  async associates(
    @Parent() parent: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser[]> {
    // Reload to ensure the authorization is loaded
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(parent.id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read associates on org: ${organization.id}`
    );

    return await this.organizationRoleService.getAssociates(organization);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('admins', () => [IUser], {
    nullable: true,
    description: 'All Users that are admins of this Organization.',
  })
  @Profiling.api
  async admins(
    @Parent() parent: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser[]> {
    // Reload to ensure the authorization is loaded
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(parent.id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read admins on org: ${organization.id}`
    );

    return await this.organizationRoleService.getAdmins(organization);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('owners', () => [IUser], {
    nullable: true,
    description: 'All Users that are owners of this Organization.',
  })
  @Profiling.api
  async owners(
    @Parent() parent: Organization,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser[]> {
    // Reload to ensure the authorization is loaded
    const organization =
      await this.organizationLookupService.getOrganizationOrFail(parent.id);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      organization.authorization,
      AuthorizationPrivilege.READ,
      `read owners on org: ${organization.id}`
    );

    return await this.organizationRoleService.getOwners(organization);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('myRoles', () => [OrganizationRole], {
    nullable: true,
    description:
      'The roles on this Organization for the currently logged in user.',
  })
  @Profiling.api
  async myRoles(
    @CurrentUser() agentInfo: AgentInfo,
    @Parent() organization: IOrganization
  ): Promise<OrganizationRole[]> {
    return this.organizationRoleService.getMyRoles(agentInfo, organization);
  }
}
