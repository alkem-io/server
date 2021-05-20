import { Context, IContext } from '@domain/context/context';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { Profiling } from '@common/decorators';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { IAspect } from '@domain/context/aspect';

@Resolver(() => IContext)
export class ContextResolverFields {
  constructor(private contextService: ContextService) {}

  @ResolveField('ecosystemModel', () => IEcosystemModel, {
    nullable: true,
    description: 'The EcosystemModel for this Context.',
  })
  @Profiling.api
  async ecosystemModel(@Parent() context: Context) {
    return await this.contextService.getEcosystemModel(context);
  }

  @ResolveField('aspects', () => [IAspect], {
    nullable: true,
    description: 'The Aspects for this Context.',
  })
  @Profiling.api
  async aspects(@Parent() context: Context) {
    return await this.contextService.getAspects(context);
  }
}
