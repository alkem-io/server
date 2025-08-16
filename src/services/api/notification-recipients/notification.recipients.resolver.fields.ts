import { Resolver } from '@nestjs/graphql';
import { NotificationRecipientsService } from './notification.recipients.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';

@Resolver(() => NotificationRecipientResult)
export class NotificationRecipientsResolverFields {
  constructor(
    private notificationRecipientsService: NotificationRecipientsService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}
}
