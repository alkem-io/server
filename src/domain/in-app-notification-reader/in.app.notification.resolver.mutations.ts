import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InAppNotificationState } from '@domain/in-app-notification/in.app.notification.state';
import { GraphqlGuard } from '@core/authorization';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { InAppNotificationReader } from './in.app.notification.reader';
import { UpdateNotificationStateInput } from './dto/in.app.notification.state.update';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
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
    const notification =
      await this.inAppNotificationReader.getRawNotificationOrFail(
        notificationData.ID
      );
    if (notification.receiverID !== agentInfo.userID) {
      throw new ForbiddenException(
        'Users can only update their own notifications',
        LogContext.IN_APP_NOTIFICATION,
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
