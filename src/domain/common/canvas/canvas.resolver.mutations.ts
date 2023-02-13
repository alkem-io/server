import { Inject, LoggerService, UseGuards } from '@nestjs/common';
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
import { CanvasContentUpdated } from '@domain/common/canvas/dto/canvas.dto.event.content.updated';
import { PubSubEngine } from 'graphql-subscriptions';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_CANVAS_CONTENT } from '@common/constants/providers';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LogContext } from '@common/enums/logging.context';
import { getRandomId } from '@src/common/utils';
import { DeleteCanvasInput } from './dto/canvas.dto.delete';
import { CanvasCheckoutService } from '../canvas-checkout/canvas.checkout.service';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { EntityNotInitializedException } from '@common/exceptions';

@Resolver(() => ICanvas)
export class CanvasResolverMutations {
  constructor(
    private elasticService: ElasticsearchService,
    private authorizationService: AuthorizationService,
    private canvasService: CanvasService,
    private canvasCheckoutService: CanvasCheckoutService,
    private canvasCheckoutAuthorizationService: CanvasCheckoutAuthorizationService,
    private canvasCheckoutLifecycleOptionsProvider: CanvasCheckoutLifecycleOptionsProvider,
    private communityResolverService: CommunityResolverService,
    @Inject(SUBSCRIPTION_CANVAS_CONTENT)
    private readonly subscriptionCanvasContent: PubSubEngine,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
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
    await this.canvasCheckoutAuthorizationService.applyAuthorizationPolicy(
      canvasCheckout,
      canvas.authorization
    );
    return this.canvasCheckoutService.getCanvasCheckoutOrFail(
      canvasCheckout.id
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
    const canvas = await this.canvasService.getCanvasOrFail(canvasData.ID, {
      relations: ['callout'],
    });
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvas.authorization,
      AuthorizationPrivilege.UPDATE_CANVAS,
      `update Canvas: ${canvas.displayName}`
    );

    if (canvas.value === canvasData.value) {
      return canvas;
    }

    const updatedCanvas = await this.canvasService.updateCanvas(
      canvas,
      canvasData,
      agentInfo
    );

    const eventID = `canvas-${getRandomId()}`;
    const subscriptionPayload: CanvasContentUpdated = {
      eventID: eventID,
      canvasID: updatedCanvas.id,
      value: updatedCanvas.value ?? '', //todo how to handle this?
    };
    this.logger.verbose?.(
      `[Canvas updated] - event published: '${eventID}'`,
      LogContext.SUBSCRIPTIONS
    );
    this.subscriptionCanvasContent.publish(
      SubscriptionType.CANVAS_CONTENT_UPDATED,
      subscriptionPayload
    );

    if (!canvas || !canvas.callout)
      throw new EntityNotInitializedException(
        `Canvas ${canvas.id} not initialized`,
        LogContext.COLLABORATION
      );
    const { hubID } =
      await this.communityResolverService.getCommunityFromCalloutOrFail(
        canvas?.callout.id
      );

    this.elasticService.calloutCanvasEdited(
      {
        id: canvas.id,
        name: canvas.displayName,
        hub: hubID,
      },
      {
        id: agentInfo.userID,
        email: agentInfo.email,
      }
    );

    return updatedCanvas;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICanvas, {
    description: 'Updates the specified Canvas.',
  })
  async deleteCanvas(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('canvasData') canvasData: DeleteCanvasInput
  ): Promise<ICanvas> {
    const canvas = await this.canvasService.getCanvasOrFail(canvasData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      canvas.authorization,
      AuthorizationPrivilege.DELETE,
      `delete Canvas: ${canvas.displayName}`
    );

    return await this.canvasService.deleteCanvas(canvas.id);
  }
}
