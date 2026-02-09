import { AuthorizationService } from '@core/authorization/authorization.service';
import { Resolver } from '@nestjs/graphql';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationRecipientResult } from './dto/notification.recipients.dto.result';
import { NotificationRecipientsService } from './notification.recipients.service';

@Resolver(() => NotificationRecipientResult)
export class NotificationRecipientsResolverFields {
  constructor(
    private notificationRecipientsService: NotificationRecipientsService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}
}
