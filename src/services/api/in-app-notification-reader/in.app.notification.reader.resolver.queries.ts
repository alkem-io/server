import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { InstrumentResolver } from '@src/apm/decorators';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { IInAppNotificationEntry } from './dto/in.app.notification.entry.interface';
import { InAppNotificationFilterInput } from './dto/in.app.notification.filter.dto.input';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverQueries {
  constructor(private inAppNotificationService: InAppNotificationService) {}

  @Query(() => [IInAppNotificationEntry], {
    nullable: false,
    description: 'Get all notifications for the logged in user.',
  })
  public async notificationsInApp(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('filter', { nullable: true }) filter?: InAppNotificationFilterInput
  ): Promise<IInAppNotificationEntry[]> {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return this.inAppNotificationService.getRawNotifications(
      agentInfo.userID,
      filter
    );
  }
}
