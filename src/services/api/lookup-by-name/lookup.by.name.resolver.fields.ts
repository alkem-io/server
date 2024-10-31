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

@Resolver(() => LookupByNameQueryResults)
export class LookupByNameResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationPackService: InnovationPackService,
    private templateService: TemplateService
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
