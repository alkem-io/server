import { Args, Query, Resolver } from '@nestjs/graphql';
import { InAppNotification } from './in.app.notification.interface';
import { InAppNotificationReader } from './in.app.notification.reader';
import { UUID, UUID_NAMEID } from '@domain/common/scalars';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UnauthorizedException, UseGuards } from '@nestjs/common';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { BaseException } from '@common/exceptions/base.exception';
import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { GraphqlGuard } from '@core/authorization';

@Resolver()
export class InAppNotificationResolverQueries {
  constructor(
    private readonly inAppNotificationReader: InAppNotificationReader
  ) {}
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

  @Query(() => [InAppNotification], {
    nullable: false,
    description: 'Get all notifications for a receiver.',
  })
  public async notificationsAll() {
    // todo: some auth
    return this.inAppNotificationReader.getNotifications();
  }
}
