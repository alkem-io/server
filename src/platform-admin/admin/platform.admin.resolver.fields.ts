import { Args, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { PlatformAdminQueryResults } from './dto/platform.admin.query.results';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { IInnovationHub } from '@domain/innovation-hub/innovation.hub.interface';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { PlatformAdminService } from './platform.admin.service';
import { PlatformAdminCommunicationQueryResults } from './dto/platform.admin.query.communication.results';
import { SpacesQueryArgs } from '@domain/space/space/dto/space.args.query.spaces';

@Resolver(() => PlatformAdminQueryResults)
export class PlatformAdminResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
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
  async spaces(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) args: SpacesQueryArgs
  ): Promise<ISpace[]> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'platformAdmin Spaces'
    );

    return this.platformAdminService.getAllSpaces(args);
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

  @ResolveField(() => PlatformAdminCommunicationQueryResults, {
    nullable: true,
    description: 'Lookup Communication related information.',
  })
  myPrivileges(): PlatformAdminCommunicationQueryResults {
    return {} as PlatformAdminCommunicationQueryResults;
  }
}
