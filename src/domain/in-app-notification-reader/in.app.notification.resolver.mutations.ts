import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { GraphqlGuard } from '@core/authorization';
import { InAppNotificationReader } from './in.app.notification.reader';
import { UpdateNotificationStateInput } from './dto/in.app.notification.state.update';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';

@Resolver()
export class InAppNotificationResolverMutations {
  constructor(
    private readonly inAppNotificationReader: InAppNotificationReader
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => InAppNotificationState, {
    description: 'Update notification state and return the notification.',
  })
  async updateNotificationState(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationData') notificationData: UpdateNotificationStateInput
  ): Promise<InAppNotificationState> {
    const notification = await this.inAppNotificationReader.getRawNotification(
      notificationData.ID
    );
    if (notification.receiverID !== agentInfo.userID) {
      throw new BaseException(
        'Users can only update their own notifications',
        LogContext.IN_APP_NOTIFICATION,
        AlkemioErrorStatus.FORBIDDEN,
        { notificationId: notificationData.ID }
      );
    }

    await this.inAppNotificationReader.updateNotificationState(
      notificationData.ID,
      notificationData.state
    );

    return notificationData.state;
  }
}
