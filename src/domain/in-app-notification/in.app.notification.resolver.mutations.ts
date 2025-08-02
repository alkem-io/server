import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InAppNotificationState } from '@domain/in-app-notification/enums/in.app.notification.state';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { UpdateNotificationStateInput } from './dto/in.app.notification.state.update';
import { InstrumentResolver } from '@src/apm/decorators';
import { InAppNotificationService } from './in.app.notification.service';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverMutations {
  constructor(
    private readonly inAppNotificationService: InAppNotificationService
  ) {}

  @Mutation(() => InAppNotificationState, {
    description: 'Update notification state and return the notification.',
  })
  async updateNotificationState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationData') notificationData: UpdateNotificationStateInput
  ): Promise<InAppNotificationState> {
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

    return notificationData.state;
  }

  @Mutation(() => Boolean, {
    description: 'Mark multiple notifications as read.',
  })
  async markNotificationsAsRead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationIds', { type: () => [String] }) notificationIds: string[]
  ): Promise<boolean> {
    return this.updateNotificationStates(
      agentInfo,
      notificationIds,
      InAppNotificationState.READ
    );
  }

  @Mutation(() => Boolean, {
    description: 'Mark multiple notifications as unread.',
  })
  async markNotificationsAsUnread(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationIds', { type: () => [String] }) notificationIds: string[]
  ): Promise<boolean> {
    return this.updateNotificationStates(
      agentInfo,
      notificationIds,
      InAppNotificationState.UNREAD
    );
  }

  private async updateNotificationStates(
    agentInfo: AgentInfo,
    notificationIds: string[],
    state: InAppNotificationState
  ): Promise<boolean> {
    if (notificationIds.length === 0) {
      return false;
    }

    const result =
      await this.inAppNotificationService.bulkUpdateNotificationState(
        notificationIds,
        agentInfo.userID,
        state
      );

    // Note: The `affected` property is not supported by all database drivers. For unsupported drivers, it will be `undefined`.
    return (result?.affected ?? 0) > 0;
  }
}
