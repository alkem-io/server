import { CanvasCheckoutStateEnum } from '@common/enums/canvas.checkout.status';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { CanvasCheckoutService } from './canvas.checkout.service';

@Resolver(() => ICanvasCheckout)
export class CanvasCheckoutResolverFields {
  constructor(private canvasCheckoutService: CanvasCheckoutService) {}

  @ResolveField('status', () => CanvasCheckoutStateEnum, {
    nullable: false,
    description: 'The checkout out state of this Canvas.',
  })
  @Profiling.api
  async status(@Parent() canvas: ICanvasCheckout) {
    return this.canvasCheckoutService.getCanvasStatus(canvas);
  }
}
