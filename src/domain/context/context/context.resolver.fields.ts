import { Context, IContext } from '@domain/context/context';
import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { IAspect } from '@domain/context/aspect';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IReference } from '@domain/common/reference';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IVisual } from '@domain/common/visual/visual.interface';
import { UUID_NAMEID } from '@domain/common/scalars';
import { AspectService } from '@domain/context/aspect/aspect.service';

@Resolver(() => IContext)
export class ContextResolverFields {
  constructor(
    private contextService: ContextService,
    private aspectService: AspectService
  ) {}

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

  @ResolveField('visuals', () => [IVisual], {
    nullable: true,
    description: 'The Visual assets for this Context.',
  })
  @Profiling.api
  async visuals(@Parent() context: Context) {
    return await this.contextService.getVisuals(context);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aspectsCount', () => Number, {
    nullable: true,
    description: 'The total number of Aspects for this Context.',
  })
  @Profiling.api
  aspectsCount(@Parent() context: Context) {
    return this.aspectService.getAspectsInContextCount(context.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aspects', () => [IAspect], {
    nullable: true,
    description: 'The Aspects for this Context.',
  })
  @Profiling.api
  async aspects(
    @Parent() context: Context,
    @Args({
      name: 'IDs',
      type: () => [UUID_NAMEID],
      description: 'The IDs (either UUID or nameID) of the aspects to return',
      nullable: true,
    })
    ids: string[],
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Aspects to return; if omitted returns all Aspects.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Aspects based on a random selection.',
      nullable: true,
    })
    shuffle: boolean
  ) {
    return await this.contextService.getAspects(context, ids, limit, shuffle);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('canvases', () => [ICanvas], {
    nullable: true,
    description: 'The Canvas entities for this Context.',
  })
  @Profiling.api
  async canvases(
    @Parent() context: Context,
    @Args({
      name: 'IDs',
      type: () => [UUID],
      description: 'The IDs of the canvases to return',
      nullable: true,
    })
    ids: string[]
  ): Promise<ICanvas[]> {
    return await this.contextService.getCanvases(context, ids);
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
