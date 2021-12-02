import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { CanvasCheckoutEventInput } from './dto/canvas.checkout.dto.event';
import { ICanvasCheckout } from './canvas.checkout.interface';
import { CanvasCheckoutService } from './canvas.checkout.service';
import { CanvasCheckoutLifecycleOptionsProvider } from './canvas.checkout.lifecycle.options.provider';

@Resolver(() => ICanvasCheckout)
export class CanvasCheckoutResolverMutations {
  constructor(
    private canvasCheckoutService: CanvasCheckoutService,
    private canvasCheckoutLifecycleOptionsProvider: CanvasCheckoutLifecycleOptionsProvider,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvasCheckout, {
    description: 'Trigger an event on the Organization Verification.',
  })
  async eventOnCanvasCheckout(
    @Args('CanvasCheckoutEventData')
    CanvasCheckoutEventData: CanvasCheckoutEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<ICanvasCheckout> {
    const CanvasCheckout =
      await this.canvasCheckoutService.getCanvasCheckoutOrFail(
        CanvasCheckoutEventData.canvasCheckoutID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      CanvasCheckout.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on organization verification: ${CanvasCheckout.id}`
    );
    return await this.canvasCheckoutLifecycleOptionsProvider.eventOnCanvasCheckout(
      CanvasCheckoutEventData,
      agentInfo
    );
  }
}
