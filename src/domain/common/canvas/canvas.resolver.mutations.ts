import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { CanvasCheckoutEventInput } from '../canvas-checkout/dto/canvas.checkout.dto.event';
import { ICanvasCheckout } from '../canvas-checkout/canvas.checkout.interface';
import { CanvasCheckoutLifecycleOptionsProvider } from '../canvas-checkout/canvas.checkout.lifecycle.options.provider';
import { CanvasCheckoutAuthorizationService } from '../canvas-checkout/canvas.checkout.service.authorization';
import { CanvasService } from './canvas.service';
import { ICanvas } from './canvas.interface';

@Resolver(() => ICanvas)
export class CanvasResolverMutations {
  constructor(
    private canvasService: CanvasService,
    private canvasCheckoutAuthorizationService: CanvasCheckoutAuthorizationService,
    private canvasCheckoutLifecycleOptionsProvider: CanvasCheckoutLifecycleOptionsProvider
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvasCheckout, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnCanvasCheckout(
    @Args('canvasCheckoutEventData')
    canvasCheckoutEventData: CanvasCheckoutEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<ICanvasCheckout> {
    const canvasCheckout =
      await this.canvasCheckoutLifecycleOptionsProvider.eventOnCanvasCheckout(
        canvasCheckoutEventData,
        agentInfo
      );
    const canvas = await this.canvasService.getCanvasOrFail(
      canvasCheckout.canvasID
    );
    return await this.canvasCheckoutAuthorizationService.applyAuthorizationPolicy(
      canvasCheckout,
      canvas.authorization
    );
  }
}
