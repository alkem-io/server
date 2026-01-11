import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationAdapter } from './notification.adapter';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { NotificationExternalAdapterModule } from '../notification-external-adapter/notification.external.adapter.module';
import { NotificationInAppAdapterModule } from '../notification-in-app-adapter/notification.in.app.adapter.module';
import { NotificationRecipientsModule } from '@services/api/notification-recipients/notification.recipients.module';
import { NotificationSpaceAdapter } from './notification.space.adapter';
import { NotificationPlatformAdapter } from './notification.platform.adapter';
import { NotificationUserAdapter } from './notification.user.adapter';
import { NotificationOrganizationAdapter } from './notification.organization.adapter';
import { NotificationVirtualContributorAdapter } from './notification.virtual.contributor.adapter';
import { MessageDetailsModule } from '@domain/communication/message.details/message.details.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';

@Module({
  imports: [
    ActivityModule,
    UrlGeneratorModule,
    ActorLookupModule,
    EntityResolverModule,
    MessageDetailsModule,
    NotificationRecipientsModule,
    NotificationExternalAdapterModule,
    NotificationInAppAdapterModule,
    SpaceLookupModule,
  ],
  providers: [
    NotificationAdapter,
    NotificationSpaceAdapter,
    NotificationPlatformAdapter,
    NotificationUserAdapter,
    NotificationOrganizationAdapter,
    NotificationVirtualContributorAdapter,
  ],
  exports: [
    NotificationAdapter,
    NotificationSpaceAdapter,
    NotificationPlatformAdapter,
    NotificationUserAdapter,
    NotificationOrganizationAdapter,
    NotificationVirtualContributorAdapter,
  ],
})
export class NotificationAdapterModule {}
