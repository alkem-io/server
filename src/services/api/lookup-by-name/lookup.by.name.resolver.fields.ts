import { Args, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LookupByNameQueryResults } from './dto/lookup.by.name.query.results';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { NameID, UUID } from '@domain/common/scalars';
import { TemplateService } from '@domain/template/template/template.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { ISpace } from '@domain/space/space/space.interface';
import { SpaceLookupService } from '@domain/space/space.lookup/space.lookup.service';

@Resolver(() => LookupByNameQueryResults)
export class LookupByNameResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService,
    private innovationPackService: InnovationPackService,
    private templateService: TemplateService,
    private userLookupService: UserLookupService,
    private spaceLookupService: SpaceLookupService,
    private organizationLookupService: OrganizationLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService
  ) {}

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified InnovationHub using a NameID',
  })
  async innovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationHub.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationHub by NameID: ${innovationHub.id}`
    );

    return innovationHub.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified InnovationPack using a NameID',
  })
  async innovationPack(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationPack.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationPack by NameID: ${innovationPack.id}`
    );

    return innovationPack.id;
  }

  @ResolveField(() => ISpace, {
    nullable: true,
    description: 'Lookup a Space using a NameID',
  })
  async space(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<ISpace> {
    const space = await this.spaceLookupService.getSpaceByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      space.authorization,
      AuthorizationPrivilege.READ_ABOUT,
      `lookup L0 Space by NameID: ${nameid}`
    );

    return space;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified User using a NameID',
  })
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const user = await this.userLookupService.getUserByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user lookup by NameID: ${agentInfo.userID || 'anonymous'}`
    );

    return user.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description: 'Lookup the ID of the specified Organization using a NameID',
  })
  async organization(
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const organization =
      await this.organizationLookupService.getOrganizationByNameIdOrFail(
        nameid
      );
    return organization.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description:
      'Lookup the ID of the specified Virtual Contributor using a NameID',
  })
  async virtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<string> {
    const virtualContributor =
      await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
        nameid
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualContributor.authorization,
      AuthorizationPrivilege.READ,
      `lookup virtual contributor by NameID: ${virtualContributor.id}`
    );

    return virtualContributor.id;
  }

  @ResolveField(() => String, {
    nullable: true,
    description:
      'Lookup the ID of the specified Template using a templatesSetId and the template NameID',
  })
  async template(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templatesSetID', { type: () => UUID }) ID: string,
    @Args('NAMEID', { type: () => NameID }) nameID: string
  ): Promise<string> {
    const template =
      await this.templateService.getTemplateByNameIDInTemplatesSetOrFail(
        ID,
        nameID
      );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      template.authorization,
      AuthorizationPrivilege.READ,
      `lookup template by NameID: ${template.id}`
    );

    return template.id;
  }
}
