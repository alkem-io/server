import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { InAppNotificationReader } from './in.app.notification.reader.service';
import { InAppNotificationEntity } from '../../../platform/in-app-notification/in.app.notification.entity';
import { InAppNotificationResolverQueries } from './in.app.notification.reader.resolver.queries';
import { InAppNotificationResolverMutations } from '../../../platform/in-app-notification/in.app.notification.resolver.mutations';
import { InAppNotificationResolverFields } from './in.app.notification.reader.resolver.fields';
import { InAppNotificationResolverSubscription } from './in.app.notification.resolver.subscription';
import {
  InAppNotificationSpaceCollaborationCalloutPublishedResolverFields,
  InAppNotificationSpaceCommunityNewMemberResolverFields,
  InAppNotificationUserMentionedResolverFields,
} from './field-resolvers';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    AuthorizationModule,
    SubscriptionServiceModule,
    InAppNotificationModule,
  ],
  providers: [
    InAppNotificationReader,
    // graphql
    InAppNotificationResolverFields,
    InAppNotificationResolverQueries,
    InAppNotificationResolverMutations,
    InAppNotificationResolverSubscription,
    // concrete resolvers
    InAppNotificationSpaceCollaborationCalloutPublishedResolverFields,
    InAppNotificationSpaceCommunityNewMemberResolverFields,
    InAppNotificationUserMentionedResolverFields,
  ],
  exports: [InAppNotificationReader],
})
export class InAppNotificationReaderModule {}
