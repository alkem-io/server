import { Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { PlatformAdminQueryResults } from './dto/platform.admin.query.results';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { PlatformAdminService } from './platform.admin.service';

@Resolver(() => PlatformAdminQueryResults)
export class PlatformAdminResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService,
    private innovationPackService: InnovationPackService,
    private userLookupService: UserLookupService,
    private spaceLookupService: SpaceLookupService,
    private organizationLookupService: OrganizationLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private platformAdminService: PlatformAdminService
  ) {}

  @ResolveField(() => [IInnovationHub], {
    nullable: true,
    description:
      'Retrieve all Innovation Hubs on the Platform. This is only available to Platform Admins.',
  })
  async innovationHubs(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IInnovationHub[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin InnovationHubs'
    );

    return this.platformAdminService.getAllInnovationHubs();
  }

  @ResolveField(() => [IInnovationPack], {
    nullable: true,
    description:
      'Retrieve all Innovation Packs on the Platform. This is only available to Platform Admins.',
  })
  async innovationPacks(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IInnovationPack[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin InnovationPacks'
    );

    return this.platformAdminService.getAllInnovationPacks();
  }

  @ResolveField(() => [ISpace], {
    nullable: true,
    description:
      'Retrieve all Spaces on the Platform. This is only available to Platform Admins.',
  })
  async spaces(@CurrentUser() agentInfo: AgentInfo): Promise<ISpace[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Spaces'
    );

    return this.platformAdminService.getAllSpaces();
  }

  @ResolveField(() => [IUser], {
    nullable: true,
    description:
      'Retrieve all Users on the Platform. This is only available to Platform Admins.',
  })
  async users(@CurrentUser() agentInfo: AgentInfo): Promise<IUser[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Users'
    );

    return this.platformAdminService.getAllUsers();
  }

  @ResolveField(() => [IOrganization], {
    nullable: true,
    description:
      'Retrieve all Organizations on the Platform. This is only available to Platform Admins.',
  })
  async organizations(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IOrganization[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Organizations'
    );
    return this.platformAdminService.getAllOrganizations();
  }

  @ResolveField(() => [IVirtualContributor], {
    nullable: true,
    description:
      'Retrieve all Virtual Contributors on the Platform. This is only available to Platform Admins.',
  })
  async virtualContributors(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IVirtualContributor[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Virtual Contributors'
    );

    return this.platformAdminService.getAllVirtualContributors();
  }
}
