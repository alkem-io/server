import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { InAppNotificationReader } from './in.app.notification.reader';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationResolverQueries } from './in.app.notification.resolver.queries';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationResolverFields } from './in.app.notification.resolver.fields';
import { InAppNotificationResolverSubscription } from './in.app.notification.resolver.subscription';
import {
  InAppNotificationCalloutPublishedResolverFields,
  InAppNotificationCommunityNewMemberResolverFields,
  InAppNotificationUserMentionedResolverFields,
} from './field-resolvers';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    AuthorizationModule,
    SubscriptionServiceModule,
  ],
  providers: [
    InAppNotificationReader,
    // graphql
    InAppNotificationResolverFields,
    InAppNotificationResolverQueries,
    InAppNotificationResolverMutations,
    InAppNotificationResolverSubscription,
    // concrete resolvers
    InAppNotificationCalloutPublishedResolverFields,
    InAppNotificationCommunityNewMemberResolverFields,
    InAppNotificationUserMentionedResolverFields,
  ],
  exports: [InAppNotificationReader],
})
export class InAppNotificationReaderModule {}
