import { Context, IContext } from '@domain/context/context';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { IAspect } from '@domain/context/aspect';
import { AuthorizationPrivilege } from '@common/enums';

@Resolver(() => IContext)
export class ContextResolverFields {
  constructor(private contextService: ContextService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('ecosystemModel', () => IEcosystemModel, {
    nullable: true,
    description: 'The EcosystemModel for this Context.',
  })
  @Profiling.api
  async ecosystemModel(@Parent() context: Context) {
    return await this.contextService.getEcosystemModel(context);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @ResolveField('aspects', () => [IAspect], {
    nullable: true,
    description: 'The Aspects for this Context.',
  })
  @Profiling.api
  async aspects(@Parent() context: Context) {
    return await this.contextService.getAspects(context);
  }
}
