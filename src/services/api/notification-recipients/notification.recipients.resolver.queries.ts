import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { NotificationRecipientsInput } from './dto/notification.recipients.dto.input';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';
import { NotificationRecipientsService } from './notification.recipients.service';

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
      `notificationRecipients query: ${actorContext.actorID}`
    );
    return this.notificationRecipientsServices.getRecipients(eventData);
  }
}
