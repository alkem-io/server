import { Args, Resolver, Query } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorContext } from '@core/actor-context';
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

  @Query(() => NotificationRecipientResult, {
    nullable: false,
    description:
      'The notificationRecipients for the provided event on the given entity.',
  })
  async notificationRecipients(
    @CurrentActor() actorContext: ActorContext,
    @Args('eventData')
    eventData: NotificationRecipientsInput
  ): Promise<NotificationRecipientResult> {
    this.authorizationService.grantAccessOrFail(
      actorContext,
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy(),
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `notificationRecipients query: ${actorContext.actorId}`
    );
    return this.notificationRecipientsServices.getRecipients(eventData);
  }
}
