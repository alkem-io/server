import { Post } from '@domain/collaboration/post/post.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Community } from '@domain/community/community/community.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationAdapter } from './notification.adapter';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { NotificationExternalAdapterModule } from '../notification-external-adapter/notification.external.adapter.module';
import { NotificationInAppAdapterModule } from '../notification-in-app-adapter/notification.in.app.adapter.module';
import { NotificationRecipientsModule } from '@services/api/notification-recipients/notification.recipients.module';
import { NotificationSpaceAdapter } from './notification.space.adapter';
import { NotificationPlatformAdapter } from './notification.platform.adapter';
import { NotificationUserAdapter } from './notification.user.adapter';

@Module({
  imports: [
    ActivityModule,
    UrlGeneratorModule,
    TypeOrmModule.forFeature([Post, Whiteboard, Community]),
    ContributorLookupModule,
    EntityResolverModule,
    NotificationRecipientsModule,
    NotificationExternalAdapterModule,
    NotificationInAppAdapterModule,
  ],
  providers: [
    NotificationAdapter,
    NotificationSpaceAdapter,
    NotificationPlatformAdapter,
    NotificationUserAdapter,
  ],
  exports: [
    NotificationAdapter,
    NotificationSpaceAdapter,
    NotificationPlatformAdapter,
  ],
})
export class NotificationAdapterModule {}
