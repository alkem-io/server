import { Aspect, Context } from '@domain/context';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { Profiling } from '@common/decorators';
import { EcosystemModel } from '../ecosystem-model';

@Resolver(() => Context)
export class ContextResolverFields {
  constructor(private contextService: ContextService) {}

  @ResolveField('ecosystemModel', () => EcosystemModel, {
    nullable: true,
    description: 'The EcosystemModel for this Context.',
  })
  @Profiling.api
  async ecosystemModel(@Parent() context: Context) {
    return await this.contextService.getEcosystemModel(context);
  }

  @ResolveField('aspects', () => [Aspect], {
    nullable: true,
    description: 'The Aspects for this Context.',
  })
  @Profiling.api
  async aspects(@Parent() context: Context) {
    return await this.contextService.getAspects(context);
  }
}
