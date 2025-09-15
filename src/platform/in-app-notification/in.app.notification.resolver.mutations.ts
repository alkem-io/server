import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UpdateResult } from 'typeorm';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { UpdateNotificationStateInput } from './dto/in.app.notification.state.update';
import { InstrumentResolver } from '@src/apm/decorators';
import { InAppNotificationService } from './in.app.notification.service';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverMutations {
  constructor(
    private readonly inAppNotificationService: InAppNotificationService,
    private readonly subscriptionPublishService: SubscriptionPublishService
  ) {}

  @Mutation(() => NotificationEventInAppState, {
    description: 'Update notification state and return the notification.',
  })
  async updateNotificationState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationData') notificationData: UpdateNotificationStateInput
  ): Promise<NotificationEventInAppState> {
    const notification =
      await this.inAppNotificationService.getRawNotificationOrFail(
        notificationData.ID
      );
    if (notification.receiverID !== agentInfo.userID) {
      throw new ForbiddenException(
        'Users can only update their own notifications',
        LogContext.IN_APP_NOTIFICATION,
        { notificationId: notificationData.ID }
      );
    }

    await this.inAppNotificationService.updateNotificationState(
      notificationData.ID,
      notificationData.state
    );

    // Update counter for the user
    const count =
      await this.inAppNotificationService.getRawNotificationsUnreadCount(
        agentInfo.userID
      );
    await this.subscriptionPublishService.publishInAppNotificationCounter(
      agentInfo.userID,
      count
    );

    return notificationData.state;
  }

  @Mutation(() => Boolean, {
    description:
      'Mark multiple notifications as read. If no IDs are provided, marks all user notifications as read.',
  })
  async markNotificationsAsRead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationIds', { type: () => [String] }) notificationIds: string[]
  ): Promise<boolean> {
    return this.updateNotificationStates(
      agentInfo,
      notificationIds,
      NotificationEventInAppState.READ
    );
  }

  @Mutation(() => Boolean, {
    description:
      'Mark multiple notifications as unread. If no IDs are provided, marks all user notifications as unread.',
  })
  async markNotificationsAsUnread(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationIds', { type: () => [String] }) notificationIds: string[]
  ): Promise<boolean> {
    return this.updateNotificationStates(
      agentInfo,
      notificationIds,
      NotificationEventInAppState.UNREAD
    );
  }

  private async updateNotificationStates(
    agentInfo: AgentInfo,
    notificationIds: string[],
    state: NotificationEventInAppState
  ): Promise<boolean> {
    let result: UpdateResult;

    if (notificationIds.length === 0) {
      // If no specific IDs provided, mark all user's notifications with the given state
      result = await this.inAppNotificationService.markAllNotificationsAsState(
        agentInfo.userID,
        state
      );
    } else {
      // Mark specific notifications
      result = await this.inAppNotificationService.bulkUpdateNotificationState(
        notificationIds,
        agentInfo.userID,
        state
      );
    }

    // Update counter for the user if any notifications were affected
    if ((result?.affected ?? 0) > 0) {
      const count =
        await this.inAppNotificationService.getRawNotificationsUnreadCount(
          agentInfo.userID
        );
      await this.subscriptionPublishService.publishInAppNotificationCounter(
        agentInfo.userID,
        count
      );
    }

    // Note: The `affected` property is not supported by all database drivers. For unsupported drivers, it will be `undefined`.
    return (result?.affected ?? 0) > 0;
  }
}
