import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { UseGuards } from '@nestjs/common';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { GraphqlGuard } from '@core/authorization';
import { InAppNotification } from './in.app.notification.interface';
import { InAppNotificationReader } from './in.app.notification.reader';

@Resolver()
export class InAppNotificationResolverQueries {
  constructor(private inAppNotificationReader: InAppNotificationReader) {}
  @UseGuards(GraphqlGuard)
  @Query(() => [InAppNotification], {
    nullable: false,
    description: 'Get all notifications for the logged in user.',
  })
  public notifications(@CurrentUser() agentInfo: AgentInfo) {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return this.inAppNotificationReader.getNotifications(agentInfo.userID);
  }
}
