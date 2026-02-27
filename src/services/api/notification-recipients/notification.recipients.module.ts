import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualActorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { NotificationRecipientsResolverFields } from './notification.recipients.resolver.fields';
import { NotificationRecipientsResolverQueries } from './notification.recipients.resolver.queries';
import { NotificationRecipientsService } from './notification.recipients.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    SpaceLookupModule,
    UserLookupModule,
    VirtualActorLookupModule,
    OrganizationLookupModule,
  ],
  providers: [
    NotificationRecipientsService,
    NotificationRecipientsResolverQueries,
    NotificationRecipientsResolverFields,
  ],
  exports: [NotificationRecipientsService],
})
export class NotificationRecipientsModule {}
