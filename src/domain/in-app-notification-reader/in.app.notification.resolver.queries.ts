import { Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { IInAppNotification } from '../in-app-notification/in.app.notification.interface';
import { InAppNotificationReader } from './in.app.notification.reader';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverQueries {
  constructor(private inAppNotificationReader: InAppNotificationReader) {}

  @Query(() => [IInAppNotification], {
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
