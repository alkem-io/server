import { Args, Resolver } from '@nestjs/graphql';
import { GraphqlGuard } from '@core/authorization';
import { UseGuards } from '@nestjs/common';
import { CurrentUser } from '@src/common/decorators';
import { ResolveField } from '@nestjs/graphql';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LookupByNameQueryResults } from './dto/lookup.by.name.query.results';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { InnovationPackService } from '@library/innovation-pack/innovaton.pack.service';
import { IInnovationPack } from '@library/innovation-pack/innovation.pack.interface';
import { NameID } from '@domain/common/scalars';

@Resolver(() => LookupByNameQueryResults)
export class LookupByNameResolverFields {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationPackService: InnovationPackService
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
      await this.innovationPackService.getInnovationPackOrFail(nameid);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationPack.authorization,
      AuthorizationPrivilege.READ,
      `lookup InnovationPack by NameID: ${innovationPack.id}`
    );

    return innovationPack;
  }
}
