import { Context, IContext } from '@domain/context/context';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { IEcosystemModel } from '@domain/context/ecosystem-model';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IReference } from '@domain/common/reference/reference.interface';
import { IVisual } from '@domain/common/visual/visual.interface';
import { ILocation } from '@domain/common/location/location.interface';

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

  @ResolveField('visuals', () => [IVisual], {
    nullable: true,
    description: 'The Visual assets for this Context.',
  })
  @Profiling.api
  async visuals(@Parent() context: Context) {
    return await this.contextService.getVisuals(context);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('location', () => ILocation, {
    nullable: false,
    description: 'The location for this Context.',
  })
  @Profiling.api
  async location(@Parent() context: IContext): Promise<ILocation> {
    return await this.contextService.getLocation(context);
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

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('recommendations', () => [IReference], {
    nullable: true,
    description: 'The Recommendations for this Context.',
  })
  @Profiling.api
  async recommendations(@Parent() context: Context) {
    return await this.contextService.getRecommendations(context);
  }
}
