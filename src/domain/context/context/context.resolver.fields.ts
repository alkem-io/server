import { Context, IContext } from '@domain/context/context';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { IAspect } from '@domain/context/aspect';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IReference } from '@domain/common/reference';
import { IVisual } from '@domain/context/visual';
import { ICanvas } from '@domain/common/canvas/canvas.interface';

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

  @ResolveField('visual', () => IVisual, {
    nullable: true,
    description: 'The Visual assets for this Context.',
  })
  @Profiling.api
  async visual(@Parent() context: Context) {
    return await this.contextService.getVisual(context);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aspects', () => [IAspect], {
    nullable: true,
    description: 'The Aspects for this Context.',
  })
  @Profiling.api
  async aspects(@Parent() context: Context) {
    return await this.contextService.getAspects(context);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('canvases', () => [ICanvas], {
    nullable: true,
    description: 'The Canvas entities for this Context.',
  })
  @Profiling.api
  async canvases(@Parent() context: Context): Promise<ICanvas[]> {
    return await this.contextService.getCanvases(context);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('references', () => [IReference], {
    nullable: true,
    description: 'The References for this Context.',
  })
  @Profiling.api
  async references(@Parent() context: Context) {
    return await this.contextService.getReferences(context);
  }
}
