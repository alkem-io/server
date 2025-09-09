import { Args, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { LogContext } from '@common/enums';
import { ForbiddenException } from '@common/exceptions';
import { InstrumentResolver } from '@src/apm/decorators';
import { InAppNotificationService } from '@platform/in-app-notification/in.app.notification.service';
import { InAppNotificationFilterInput } from './dto/in.app.notification.filter.dto.input';
import { PaginationArgs, PaginatedInAppNotifications } from '@core/pagination';

@InstrumentResolver()
@Resolver()
export class InAppNotificationResolverQueries {
  constructor(private inAppNotificationService: InAppNotificationService) {}

  @Query(() => PaginatedInAppNotifications, {
    nullable: false,
    description: 'Get paginated notifications for the logged in user.',
  })
  public async notificationsInApp(
    @CurrentUser() agentInfo: AgentInfo,
    @Args({ nullable: true }) pagination: PaginationArgs,
    @Args('filter', { nullable: true }) filter?: InAppNotificationFilterInput
  ): Promise<PaginatedInAppNotifications> {
    if (!agentInfo.userID) {
      throw new ForbiddenException(
        'User could not be resolved',
        LogContext.IN_APP_NOTIFICATION,
        { agentInfo }
      );
    }

    return await this.inAppNotificationService.getPaginatedNotifications(
      agentInfo.userID,
      pagination,
      filter
    );
  }
}
