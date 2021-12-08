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
import { UpdateCanvasDirectInput } from './dto/canvas.dto.update.direct';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver(() => ICanvas)
export class CanvasResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Updates the specified Canvas.',
  })
  async updateCanvas(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasData') canvasData: UpdateCanvasDirectInput
  ): Promise<ICanvas> {
    const canvas = await this.canvasService.getCanvasOrFail(canvasData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvas.authorization,
      AuthorizationPrivilege.UPDATE,
      `update Canvas: ${canvas.name}`
    );
    return await this.canvasService.updateCanvas(canvas, canvasData);
  }
}
