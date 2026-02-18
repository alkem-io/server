import { CurrentActor } from '@common/decorators';
import { LogContext } from '@common/enums';
import { NotificationEventInAppState } from '@common/enums/notification.event.in.app.state';
import { ForbiddenException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationEventsFilterInput } from '@services/api/me/dto/me.notification.event.filter.dto.input';
import { SubscriptionPublishService } from '@services/subscriptions/subscription-service';
import { InstrumentResolver } from '@src/apm/decorators';
import { UpdateNotificationStateInput } from './dto/in.app.notification.state.update';
import { InAppNotificationService } from './in.app.notification.service';

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
    @CurrentActor() actorContext: ActorContext,
    @Args('notificationData') notificationData: UpdateNotificationStateInput
  ): Promise<NotificationEventInAppState> {
    const notification =
      await this.inAppNotificationService.getRawNotificationOrFail(
        notificationData.ID
      );
    if (notification.receiverID !== actorContext.actorId) {
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
        actorContext.actorId
      );
    await this.subscriptionPublishService.publishInAppNotificationCounter(
      actorContext.actorId,
      count
    );

    return notificationData.state;
  }

  @Mutation(() => Boolean, {
    description:
      'Mark notifications as read. If no filter is provided, marks all user notifications as read. If filter with types is provided, marks only those notification types as read.',
  })
  async markNotificationsAsRead(
    @CurrentActor() actorContext: ActorContext,
    @Args('filter', {
      type: () => NotificationEventsFilterInput,
      nullable: true,
    })
    filter?: NotificationEventsFilterInput
  ): Promise<boolean> {
    return this.updateNotificationStates(
      actorContext,
      NotificationEventInAppState.READ,
      filter
    );
  }

  @Mutation(() => Boolean, {
    description:
      'Mark notifications as unread. If no filter is provided, marks all user notifications as unread. If filter with types is provided, marks only those notification types as unread.',
  })
  async markNotificationsAsUnread(
    @CurrentActor() actorContext: ActorContext,
    @Args('filter', {
      type: () => NotificationEventsFilterInput,
      nullable: true,
    })
    filter?: NotificationEventsFilterInput
  ): Promise<boolean> {
    return this.updateNotificationStates(
      actorContext,
      NotificationEventInAppState.UNREAD,
      filter
    );
  }

  private async updateNotificationStates(
    actorContext: ActorContext,
    state: NotificationEventInAppState,
    filter?: NotificationEventsFilterInput
  ): Promise<boolean> {
    // Update notifications based on the filter
    // If no filter provided, updates all notifications
    // If filter with types provided, updates only those notification types
    const result =
      await this.inAppNotificationService.bulkUpdateNotificationStateByTypes(
        actorContext.actorId,
        state,
        filter
      );

    // Update counter for the user if any notifications were affected
    if ((result?.affected ?? 0) > 0) {
      const count =
        await this.inAppNotificationService.getRawNotificationsUnreadCount(
          actorContext.actorId
        );
      await this.subscriptionPublishService.publishInAppNotificationCounter(
        actorContext.actorId,
        count
      );
    }

    // Note: The `affected` property is not supported by all database drivers. For unsupported drivers, it will be `undefined`.
    return (result?.affected ?? 0) > 0;
  }
}
