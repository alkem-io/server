import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { AgentInfo, GraphqlGuard } from '@src/core';
import { CanvasContentUpdated } from '@domain/common/canvas/dto/canvas.dto.event.content.updated';
import { AuthorizationPrivilege, CurrentUser, LogContext } from '@src/common';
import { UUID } from '@domain/common/scalars';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CanvasService } from '@domain/common/canvas/canvas.service';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_CANVAS_CONTENT } from '@common/constants/providers';

@Resolver()
export class CanvasResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_CANVAS_CONTENT)
    private subscriptionCanvasContent: PubSubEngine,
    private canvasService: CanvasService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => CanvasContentUpdated, {
    description: 'Receive updated content of a canvas',
    async resolve(
      this: CanvasResolverSubscriptions,
      value: CanvasContentUpdated
    ): Promise<CanvasContentUpdated> {
      this.logger.verbose?.(
        `[CanvasContentUpdate Resolve] sending out event for Canvas: ${value.canvasID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: CanvasResolverSubscriptions,
      payload: CanvasContentUpdated,
      variables: any,
      context: any
    ): Promise<boolean> {
      const canvasIDs: string[] = variables.canvasIDs;
      this.logger.verbose?.(
        `[CanvasContentUpdate Filter] Variable of IDs to filter by: ${canvasIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      if (!canvasIDs) {
        const agentInfo = context.req?.user;
        // If subscribed to all then need to check on every update the authorization to see it
        this.logger.verbose?.(
          `[UpdateMsg Filter] User (${agentInfo.email}) subscribed to all canvases; filtering by Authorization to see ${payload.canvasID}`,
          LogContext.SUBSCRIPTIONS
        );
        const canvas = await this.canvasService.getCanvasOrFail(
          payload.canvasID
        );
        const filter = await this.authorizationService.isAccessGranted(
          agentInfo,
          canvas.authorization,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `[CanvasContentUpdate Filter] User (${agentInfo.email}) filter: ${filter}`,
          LogContext.SUBSCRIPTIONS
        );
        return filter;
      } else {
        const inList = canvasIDs.includes(payload.canvasID);
        this.logger.verbose?.(
          `[CanvasContentUpdate Filter] result is ${inList}`,
          LogContext.SUBSCRIPTIONS
        );
        return inList;
      }
    },
  })
  async canvasContentUpdated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'canvasIDs',
      type: () => [UUID],
      description:
        'The IDs of the Canvases to subscribe to; if omitted subscribe to all Canvas content updates.',
      nullable: true,
    })
    canvasIDs: string[]
  ) {
    if (canvasIDs) {
      this.logger.verbose?.(
        `[UpdateMsg] User (${agentInfo.email}) subscribing to the following updates: ${canvasIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      for (const canvasID of canvasIDs) {
        // check the user has the READ privilege
        const canvas = await this.canvasService.getCanvasOrFail(canvasID);
        await this.authorizationService.grantAccessOrFail(
          agentInfo,
          canvas.authorization,
          AuthorizationPrivilege.READ,
          `subscription to canvas content update of: ${canvas.displayName}`
        );
      }
    } else {
      this.logger.verbose?.(
        `User (${agentInfo.email}) subscribing to all canvases content update`,
        LogContext.SUBSCRIPTIONS
      );
      // Todo: either disable this option or find a way to do this once in this method and pass the resulting
      // array of discussionIDs to the filter call
    }

    return this.subscriptionCanvasContent.asyncIterator(
      SubscriptionType.CANVAS_CONTENT_UPDATED
    );
  }
}
