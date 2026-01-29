import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { OrganizationFilterInput } from '@core/filtering/input-types/organization.filter.input';
import { UserFilterInput } from '@core/filtering/input-types/user.filter.input';
import { PaginatedOrganization } from '@core/pagination/paginated.organization';
import { PaginatedUsers } from '@core/pagination/paginated.user';
import { PaginationArgs } from '@core/pagination/pagination.args';
import { ContributorQueryArgs } from '@domain/community/contributor/dto/contributor.query.args';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { SpacesQueryArgs } from '@domain/space/space/dto/space.args.query.spaces';
import { ISpace } from '@domain/space/space/space.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { InnovationPacksInput } from '@library/library/dto/library.dto.innovationPacks.input';
import { Args, ResolveField, Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { CurrentUser } from '@src/common/decorators';
import { PlatformAdminCommunicationQueryResults } from './dto/platform.admin.query.communication.results';
import { PlatformAdminIdentityQueryResults } from './dto/platform.admin.query.identity.results';
import { PlatformAdminQueryResults } from './dto/platform.admin.query.results';
import { PlatformAdminService } from './platform.admin.service';

@Resolver(() => PlatformAdminQueryResults)
export class PlatformAdminResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private platformAdminService: PlatformAdminService
  ) {}

  @ResolveField(() => [IInnovationHub], {
    nullable: false,
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
    nullable: false,
    description:
      'Retrieve all Innovation Packs on the Platform. This is only available to Platform Admins.',
  })
  async innovationPacks(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('queryData', { type: () => InnovationPacksInput, nullable: true })
    args?: InnovationPacksInput
  ): Promise<IInnovationPack[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin InnovationPacks'
    );

    return this.platformAdminService.getAllInnovationPacks(args);
  }

  @ResolveField(() => [ISpace], {
    nullable: false,
    description:
      'Retrieve all Spaces on the Platform. This is only available to Platform Admins.',
  })
  async spaces(
    @CurrentUser() agentInfo: AgentInfo,
    @Args() args: SpacesQueryArgs
  ): Promise<ISpace[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Spaces'
    );

    return this.platformAdminService.getAllSpaces(args);
  }

  @ResolveField(() => PaginatedUsers, {
    nullable: false,
    description:
      'Retrieve all Users on the Platform. This is only available to Platform Admins.',
  })
  async users(
    @CurrentUser() agentInfo: AgentInfo,
    @Args() pagination: PaginationArgs,
    @Args({
      name: 'withTags',
      nullable: true,
      description: 'Return only users with tags',
    })
    withTags?: boolean,
    @Args('filter', { nullable: true }) filter?: UserFilterInput
  ): Promise<PaginatedUsers> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Users'
    );

    return this.platformAdminService.getAllUsers(pagination, withTags, filter);
  }

  @ResolveField(() => PaginatedOrganization, {
    nullable: false,
    description:
      'Retrieve all Organizations on the Platform. This is only available to Platform Admins.',
  })
  async organizations(
    @CurrentUser() agentInfo: AgentInfo,
    @Args() pagination: PaginationArgs,
    @Args('status', {
      nullable: true,
      description: 'Return only Organizations with this verification status',
      type: () => OrganizationVerificationEnum,
    })
    status?: OrganizationVerificationEnum,
    @Args('filter', { nullable: true }) filter?: OrganizationFilterInput
  ): Promise<PaginatedOrganization> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Organizations'
    );
    return this.platformAdminService.getAllOrganizations(
      pagination,
      filter,
      status
    );
  }

  @ResolveField(() => [IVirtualContributor], {
    nullable: false,
    description:
      'Retrieve all Virtual Contributors on the Platform. This is only available to Platform Admins.',
  })
  async virtualContributors(
    @CurrentUser() agentInfo: AgentInfo,
    @Args() args: ContributorQueryArgs
  ): Promise<IVirtualContributor[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Virtual Contributors'
    );

    return this.platformAdminService.getAllVirtualContributors(args);
  }

  @ResolveField(() => PlatformAdminCommunicationQueryResults, {
    nullable: false,
    description: 'Lookup Communication related information.',
  })
  async communication(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<PlatformAdminCommunicationQueryResults> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Communication'
    );
    return {} as PlatformAdminCommunicationQueryResults;
  }

  @ResolveField(() => PlatformAdminIdentityQueryResults, {
    nullable: false,
    description: 'Lookup Identity related information.',
  })
  async identity(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<PlatformAdminIdentityQueryResults> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Identity'
    );
    return {} as PlatformAdminIdentityQueryResults;
  }
}
