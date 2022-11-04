import { AuthorizationPrivilege } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { IOrganization } from '@domain/community';
import { UseGuards } from '@nestjs/common';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AuthorizationAgentPrivilege, Profiling } from '@src/common/decorators';
import { ITemplatesSet } from '@domain/template/templates-set';
import { IInnovationPack } from './innovation.pack.interface';
import { InnovationPackService } from './innovaton.pack.service';

@Resolver(() => IInnovationPack)
export class InnovationPackResolverFields {
  constructor(private innovationPackService: InnovationPackService) {}

  @ResolveField('provider', () => IOrganization, {
    nullable: true,
    description: 'The InnovationPack provider.',
  })
  @Profiling.api
  async provider(
    @Parent() innovationPack: IInnovationPack
  ): Promise<IOrganization | undefined> {
    return await this.innovationPackService.getProvider(innovationPack.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('templates', () => ITemplatesSet, {
    nullable: true,
    description: 'The templates in use by this InnovationPack',
  })
  @UseGuards(GraphqlGuard)
  async templatesSet(
    @Parent() innovationPack: IInnovationPack
  ): Promise<ITemplatesSet> {
    return await this.innovationPackService.getTemplatesSetOrFail(
      innovationPack.id
    );
  }
}
