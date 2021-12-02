import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { CanvasCheckoutEventInput } from './dto/canvas.checkout.dto.event';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { CanvasCheckoutService } from './canvas.checkout.service';
import { CanvasCheckoutLifecycleOptionsProvider } from './canvas.checkout.lifecycle.options.provider';
import { CanvasCheckoutAuthorizationService } from './canvas.checkout.service.authorization';

@Resolver(() => ICanvasCheckout)
export class CanvasCheckoutResolverMutations {
  constructor(
    private canvasCheckoutService: CanvasCheckoutService,
    private canvasCheckoutAuthorizationService: CanvasCheckoutAuthorizationService,
    private canvasCheckoutLifecycleOptionsProvider: CanvasCheckoutLifecycleOptionsProvider
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvasCheckout, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnCanvasCheckout(
    @Args('CanvasCheckoutEventData')
    canvasCheckoutEventData: CanvasCheckoutEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<ICanvasCheckout> {
    return await this.canvasCheckoutLifecycleOptionsProvider.eventOnCanvasCheckout(
      canvasCheckoutEventData,
      agentInfo
    );
  }
}
