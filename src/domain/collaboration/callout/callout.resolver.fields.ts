import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { CalloutService } from './callout.service';
import { AuthorizationAgentPrivilege, Profiling } from '@common/decorators';
import { AuthorizationPrivilege } from '@common/enums';
import { UseGuards } from '@nestjs/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { Callout, ICallout } from '@domain/collaboration/callout';
import { IAspect } from '@domain/collaboration/aspect';
import { IComments } from '@domain/communication/comments/comments.interface';
import { UUID_NAMEID, UUID } from '@domain/common/scalars';
import { ICanvas } from '@domain/common/canvas/canvas.interface';
import { IAspectTemplate } from '@domain/template/aspect-template/aspect.template.interface';

@Resolver(() => ICallout)
export class CalloutResolverFields {
  constructor(private calloutService: CalloutService) {}

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('aspects', () => [IAspect], {
    nullable: true,
    description: 'The Aspects for this Callout.',
  })
  @Profiling.api
  async aspects(
    @Parent() callout: Callout,
    @Args({
      name: 'IDs',
      type: () => [UUID_NAMEID],
      description: 'The IDs (either UUID or nameID) of the Aspects to return',
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
  ): Promise<IAspect[]> {
    return await this.calloutService.getAspectsFromCallout(
      callout,
      ids,
      limit,
      shuffle
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('canvases', () => [ICanvas], {
    nullable: true,
    description: 'The Canvas entities for this Callout.',
  })
  @Profiling.api
  async canvases(
    @Parent() callout: Callout,
    @Args({
      name: 'IDs',
      type: () => [UUID],
      description: 'The IDs of the canvases to return',
      nullable: true,
    })
    ids: string[],
    @Args({
      name: 'limit',
      type: () => Float,
      description:
        'The number of Canvases to return; if omitted return all Canvases.',
      nullable: true,
    })
    limit: number,
    @Args({
      name: 'shuffle',
      type: () => Boolean,
      description:
        'If true and limit is specified then return the Canvases based on a random selection. Defaults to false.',
      nullable: true,
    })
    shuffle: boolean
  ): Promise<ICanvas[]> {
    return await this.calloutService.getCanvasesFromCallout(
      callout,
      ids,
      limit,
      shuffle
    );
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('comments', () => IComments, {
    nullable: true,
    description: 'The comments for this Callout.',
  })
  @Profiling.api
  async comments(@Parent() callout: ICallout): Promise<IComments | undefined> {
    return await this.calloutService.getCommentsFromCallout(callout.id);
  }

  @AuthorizationAgentPrivilege(AuthorizationPrivilege.READ)
  @UseGuards(GraphqlGuard)
  @ResolveField('cardTemplate', () => IAspectTemplate, {
    nullable: true,
    description: 'The card template for this Callout.',
  })
  @Profiling.api
  async cardTemplate(
    @Parent() callout: ICallout
  ): Promise<IAspectTemplate | undefined> {
    return await this.calloutService.getCardTemplateFromCallout(callout.id);
  }
}
