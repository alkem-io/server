import { Args, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LookupByNameQueryResults } from './dto/lookup.by.name.query.results';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InnovationPackService } from '@library/innovation-pack/innovation.pack.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { NameID, UUID } from '@domain/common/scalars';
import { TemplateService } from '@domain/template/template/template.service';
import { ITemplate } from '@domain/template/template/template.interface';
import { IUser } from '@domain/community/user/user.interface';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { IOrganization } from '@domain/community/organization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';

@Resolver(() => LookupByNameQueryResults)
export class LookupByNameResolverFields {
  constructor(
    private platformAuthorizationService: PlatformAuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private innovationPackService: InnovationPackService,
    private templateService: TemplateService,
    private userLookupService: UserLookupService,
    private organizationLookupService: OrganizationLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService
  ) {}

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IInnovationPack, {
    nullable: true,
    description: 'Lookup the specified InnovationPack using a NameID',
  })
  async innovationPack(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<IInnovationPack> {
    const innovationPack =
      await this.innovationPackService.getInnovationPackByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationPack.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationPack by NameID: ${innovationPack.id}`
    );

    return innovationPack;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => IUser, {
    nullable: true,
    description: 'Lookup the specified User using a NameID',
  })
  async user(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<IUser> {
    const user = await this.userLookupService.getUserByNameIdOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.READ_USERS,
      `user lookup by NameID: ${agentInfo.email}`
    );

    return user;
  }

  @ResolveField(() => IOrganization, {
    nullable: true,
    description: 'Lookup the specified Organization using a NameID',
  })
  async organization(
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<IOrganization> {
    return await this.organizationLookupService.getOrganizationByNameIdOrFail(
      nameid
    );
  }

  @ResolveField(() => IVirtualContributor, {
    nullable: true,
    description: 'Lookup the specified Virtual Contributor using a NameID',
  })
  async virtualContributor(
    @Args('NAMEID', { type: () => NameID }) nameid: string
  ): Promise<IVirtualContributor> {
    const virtualContributor =
      await this.virtualContributorLookupService.getVirtualContributorByNameIdOrFail(
        nameid
      );

    return virtualContributor;
  }

  @UseGuards(GraphqlGuard)
  @ResolveField(() => ITemplate, {
    nullable: true,
    description:
      'Lookup the specified Template using a templatesSetId and the template NameID',
  })
  async template(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('templatesSetID', { type: () => UUID }) ID: string,
    @Args('NAMEID', { type: () => NameID }) nameID: string
  ): Promise<ITemplate> {
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

    return template;
  }
}
