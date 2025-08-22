import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { InstrumentResolver } from '@src/apm/decorators';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { InAppNotificationFilterInput } from './dto/in.app.notification.filter.dto.input';
import { IInAppNotification } from '@platform/in-app-notification/in.app.notification.interface';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverQueries {
  constructor(private inAppNotificationService: InAppNotificationService) {}

  @Query(() => [IInAppNotification], {
    nullable: false,
    description: 'Get all notifications for the logged in user.',
  })
  public async notificationsInApp(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('filter', { nullable: true }) filter?: InAppNotificationFilterInput
  ): Promise<IInAppNotification[]> {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return await this.inAppNotificationService.getRawNotifications(
      agentInfo.userID,
      filter
    );
  }
}
