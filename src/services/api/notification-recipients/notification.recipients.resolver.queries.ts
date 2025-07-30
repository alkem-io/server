import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { NotificationRecipientsService } from './notification.recipients.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationRecipientsInput } from './dto/notification.recipients.dto.input';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';

@InstrumentResolver()
@Resolver()
export class NotificationRecipientsResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationRecipientsServices: NotificationRecipientsService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @Query(() => NotificationRecipientsInput, {
    nullable: false,
    description: 'The notificationRecipients that that the specified User has.',
  })
  async notificationRecipients(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('notificationRecipientsData')
    notificationRecipientsData: NotificationRecipientsInput
  ): Promise<NotificationRecipientResult> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `notificationRecipients query: ${agentInfo.email}`
    );
    return this.notificationRecipientsServices.getRecipients(
      notificationRecipientsData
    );
  }
}
