import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { InAppNotificationReader } from './in.app.notification.reader';
import { InAppNotificationEntity } from '../in-app-notification/in.app.notification.entity';
import { InAppNotificationResolverQueries } from './in.app.notification.resolver.queries';
import { InAppNotificationResolverMutations } from './in.app.notification.resolver.mutations';
import { InAppNotificationResolverFields } from './in.app.notification.resolver.fields';
import {
  InAppNotificationCalloutPublishedResolverFields,
  InAppNotificationCommunityNewMemberResolverFields,
  InAppNotificationUserMentionedResolverFields,
} from './field-resolvers';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationEntity]),
    AuthorizationModule,
  ],
  providers: [
    InAppNotificationReader,
    // graphql
    InAppNotificationResolverFields,
    InAppNotificationResolverQueries,
    InAppNotificationResolverMutations,
    // concrete resolvers
    InAppNotificationCalloutPublishedResolverFields,
    InAppNotificationCommunityNewMemberResolverFields,
    InAppNotificationUserMentionedResolverFields,
  ],
  exports: [InAppNotificationReader],
})
export class InAppNotificationReaderModule {}
