import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { ICanvas } from './canvas.interface';
import { CanvasService } from './canvas.service';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@src/core';
import { IVisual } from '@src/domain';

@Resolver(() => ICanvas)
export class CanvasResolverFields {
  constructor(private canvasService: CanvasService) {}

  @ResolveField('checkout', () => ICanvasCheckout, {
    nullable: true,
    description: 'The checkout out state of this Canvas.',
  })
  @Profiling.api
  async checkout(@Parent() canvas: ICanvas) {
    return await this.canvasService.getCanvasCheckout(canvas);
  }

  @UseGuards(GraphqlGuard)
  @ResolveField('preview', () => IVisual, {
    nullable: true,
    description: 'The preview image for this Canvas.',
  })
  @Profiling.api
  async preview(@Parent() canvas: ICanvas): Promise<IVisual> {
    return await this.canvasService.getPreview(canvas);
  }
}
