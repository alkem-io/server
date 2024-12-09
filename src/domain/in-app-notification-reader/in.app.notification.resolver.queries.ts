import { Args, Query, Resolver } from '@nestjs/graphql';
import { UUID } from '@domain/common/scalars';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UseGuards } from '@nestjs/common';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';
import { InAppNotification } from './in.app.notification.interface';
import { InAppNotificationReader } from './in.app.notification.reader';

@Resolver()
export class InAppNotificationResolverQueries {
  constructor(private inAppNotificationReader: InAppNotificationReader) {}
  @UseGuards(GraphqlGuard)
  @Query(() => [InAppNotification], {
    nullable: false,
    description: 'Get all notifications for a receiver.',
  })
  public async notifications(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('receiverID', { type: () => UUID, nullable: false })
    receiverID: string
  ) {
    // todo: some other auth
    if (receiverID !== agentInfo.userID) {
      throw new BaseException(
        'Users can only view their own notifications',
        LogContext.IN_APP_NOTIFICATION,
        AlkemioErrorStatus.FORBIDDEN,
        { receiverID }
      );
    }

    return this.inAppNotificationReader.getNotifications(receiverID);
  }
}
