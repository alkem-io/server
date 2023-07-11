import { Args, Resolver, Subscription } from '@nestjs/graphql';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { AgentInfo } from '@src/core/authentication/agent-info';
import { WhiteboardContentUpdated } from '@domain/common/whiteboard/dto/whiteboard.dto.event.content.updated';
import { UUID } from '@domain/common/scalars';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { WhiteboardService } from '@domain/common/whiteboard/whiteboard.service';
import { SubscriptionType } from '@common/enums/subscription.type';
import { SUBSCRIPTION_WHITEBOARD_CONTENT } from '@common/constants/providers';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UnableToSubscribeException } from '@common/exceptions';

@Resolver()
export class WhiteboardResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_WHITEBOARD_CONTENT)
    private subscriptionWhiteboardContent: PubSubEngine,
    private whiteboardService: WhiteboardService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Subscription(() => WhiteboardContentUpdated, {
    description: 'Receive updated content of a whiteboard',
    async resolve(
      this: WhiteboardResolverSubscriptions,
      value: WhiteboardContentUpdated
    ): Promise<WhiteboardContentUpdated> {
      this.logger.verbose?.(
        `[WhiteboardContentUpdate Resolve] sending out event for Whiteboard: ${value.whiteboardID} `,
        LogContext.SUBSCRIPTIONS
      );
      return value;
    },
    async filter(
      this: WhiteboardResolverSubscriptions,
      payload: WhiteboardContentUpdated,
      variables: any,
      context: any
    ): Promise<boolean> {
      const whiteboardIDs: string[] = variables.whiteboardIDs;
      this.logger.verbose?.(
        `[WhiteboardContentUpdate Filter] Variable of IDs to filter by: ${whiteboardIDs}`,
        LogContext.SUBSCRIPTIONS
      );
      if (!whiteboardIDs) {
        const agentInfo = context.req?.user;
        // If subscribed to all then need to check on every update the authorization to see it
        this.logger.verbose?.(
          `[UpdateMsg Filter] User (${agentInfo.email}) subscribed to all whiteboards; filtering by Authorization to see ${payload.whiteboardID}`,
          LogContext.SUBSCRIPTIONS
        );
        const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
          payload.whiteboardID
        );
        const filter = await this.authorizationService.isAccessGranted(
          agentInfo,
          whiteboard.authorization,
          AuthorizationPrivilege.READ
        );
        this.logger.verbose?.(
          `[WhiteboardContentUpdate Filter] User (${agentInfo.email}) filter: ${filter}`,
          LogContext.SUBSCRIPTIONS
        );
        return filter;
      } else {
        const inList = whiteboardIDs.includes(payload.whiteboardID);
        this.logger.verbose?.(
          `[WhiteboardContentUpdate Filter] result is ${inList}`,
          LogContext.SUBSCRIPTIONS
        );
        return inList;
      }
    },
  })
  async whiteboardContentUpdated(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({
      name: 'whiteboardIDs',
      type: () => [UUID],
      description: 'The IDs of the Whiteboards to subscribe to.',
      nullable: false,
    })
    whiteboardIDs: string[]
  ) {
    if (!whiteboardIDs.length) {
      throw new UnableToSubscribeException(
        'You need to provide at least one whiteboard ID',
        LogContext.SUBSCRIPTIONS
      );
    }

    this.logger.verbose?.(
      `[UpdateMsg] User (${agentInfo.email}) subscribing to the following updates: ${whiteboardIDs}`,
      LogContext.SUBSCRIPTIONS
    );
    for (const whiteboardID of whiteboardIDs) {
      // check the user has the READ privilege
      const whiteboard = await this.whiteboardService.getWhiteboardOrFail(
        whiteboardID
      );
      await this.authorizationService.grantAccessOrFail(
        agentInfo,
        whiteboard.authorization,
        AuthorizationPrivilege.READ,
        `subscription to whiteboard content update of: ${whiteboard.nameID}`
      );
    }

    return this.subscriptionWhiteboardContent.asyncIterator(
      SubscriptionType.WHITEBOARD_CONTENT_UPDATED
    );
  }
}
