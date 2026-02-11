import { MessageDetailsModule } from '@domain/communication/message.details/message.details.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { NotificationRecipientsModule } from '@services/api/notification-recipients/notification.recipients.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationExternalAdapterModule } from '../notification-external-adapter/notification.external.adapter.module';
import { NotificationInAppAdapterModule } from '../notification-in-app-adapter/notification.in.app.adapter.module';
import { NotificationAdapter } from './notification.adapter';
import { NotificationOrganizationAdapter } from './notification.organization.adapter';
import { NotificationPlatformAdapter } from './notification.platform.adapter';
import { NotificationSpaceAdapter } from './notification.space.adapter';
import { NotificationUserAdapter } from './notification.user.adapter';
import { NotificationVirtualContributorAdapter } from './notification.virtual.contributor.adapter';

@Module({
  imports: [
    ActivityModule,
    UrlGeneratorModule,
    ContributorLookupModule,
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
