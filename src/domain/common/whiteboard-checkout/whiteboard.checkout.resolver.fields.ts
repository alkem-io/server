import { WhiteboardCheckoutStateEnum } from '@common/enums/whiteboard.checkout.status';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { IWhiteboardCheckout } from './whiteboard.checkout.interface';
import { WhiteboardCheckoutService } from './whiteboard.checkout.service';

@Resolver(() => IWhiteboardCheckout)
export class WhiteboardCheckoutResolverFields {
  constructor(private whiteboardCheckoutService: WhiteboardCheckoutService) {}

  @ResolveField('status', () => WhiteboardCheckoutStateEnum, {
    nullable: false,
    description: 'The checkout out state of this Whiteboard.',
  })
  @Profiling.api
  async status(@Parent() whiteboard: IWhiteboardCheckout) {
    return this.whiteboardCheckoutService.getWhiteboardStatus(whiteboard);
  }
}
