import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { ICanvas } from './canvas.interface';
import { CanvasService } from './canvas.service';

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
}
