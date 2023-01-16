import { CurrentUser } from '@common/decorators/current-user.decorator';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AgentInfo } from '@core/authentication/agent-info';
import { GraphqlGuard } from '@core/authorization';
import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver } from '@nestjs/graphql';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { PubSubEngine } from 'graphql-subscriptions';
import { LogContext } from '@common/enums/logging.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { SUBSCRIPTION_ASPECT_COMMENT } from '@constants/providers';
import { CalendarEventCommentsMessageReceived } from './dto/event.dto.event.message.received';
import { TypedSubscription } from '@src/common/decorators';
import { CalendarEventMessageReceivedArgs } from './dto/event.message.received.args';
import { CalendarEventMessageReceivedPayload } from './dto/event.message.received.payload';
import { CalendarEventService } from './event.service';

@Resolver()
export class CalendarEventResolverSubscriptions {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(SUBSCRIPTION_ASPECT_COMMENT)
    private subscriptionCalendarEventComment: PubSubEngine,
    private calendarEventService: CalendarEventService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @TypedSubscription<
    CalendarEventMessageReceivedPayload,
    CalendarEventMessageReceivedArgs
  >(() => CalendarEventCommentsMessageReceived, {
    description: 'Receive new comment on CalendarEvent',
    resolve(this: CalendarEventResolverSubscriptions, payload, args, context) {
      const agentInfo = context.req?.user;
      const logMsgPrefix = `[User (${agentInfo.email}) CalendarEvent comments] - `;
      this.logger.verbose?.(
        `${logMsgPrefix} sending out new message event for CalendarEvent: ${payload.calendarEventID} `,
        LogContext.SUBSCRIPTIONS
      );
      return payload;
    },
    async filter(
      this: CalendarEventResolverSubscriptions,
      payload,
      variables,
      context
    ) {
      const agentInfo = context.req.user;
      const logMsgPrefix = `[User (${agentInfo.email}) CalendarEvent comments]`;
      this.logger.verbose?.(
        `${logMsgPrefix} Filtering event '${payload.eventID}'`,
        LogContext.SUBSCRIPTIONS
      );

      const isSameCommentsInstance =
        payload.calendarEventID === variables.calendarEventID;
      this.logger.verbose?.(
        `${logMsgPrefix} Filter result is ${isSameCommentsInstance}`,
        LogContext.SUBSCRIPTIONS
      );
      return isSameCommentsInstance;
    },
  })
  async calendarEventCommentsMessageReceived(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: false }) args: CalendarEventMessageReceivedArgs
  ) {
    const logMsgPrefix = `[User (${agentInfo.email}) CalendarEvent comments] - `;
    this.logger.verbose?.(
      `${logMsgPrefix} Subscribing to the following comments of CalendarEvent: ${args.calendarEventID}`,
      LogContext.SUBSCRIPTIONS
    );
    // check the user has the READ privilege
    const comments = await this.calendarEventService.getComments(
      args.calendarEventID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      comments.authorization,
      AuthorizationPrivilege.READ,
      `subscription to calendarEvent comments on: ${comments.displayName}`
    );

    return this.subscriptionCalendarEventComment.asyncIterator(
      SubscriptionType.ASPECT_COMMENTS_MESSAGE_RECEIVED
    );
  }
}
