import { Context, IContext } from '@domain/context/context';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';

@Resolver(() => IContext)
export class ContextResolverFields {
  constructor(private contextService: ContextService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('ecosystemModel', () => IEcosystemModel, {
    nullable: true,
    description: 'The EcosystemModel for this Context.',
  })
  @Profiling.api
  async ecosystemModel(@Parent() context: Context) {
    return await this.contextService.getEcosystemModel(context);
  }
}
