import { Module } from '@nestjs/common';
import { NotificationRecipientsService } from './notification.recipients.service';
import { NotificationRecipientsResolverQueries } from './notification.recipients.resolver.queries';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { NotificationRecipientsResolverFields } from './notification.recipients.resolver.fields';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';

@Module({
  imports: [
    ActorLookupModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    SpaceLookupModule,
    UserLookupModule,
    VirtualContributorLookupModule,
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
