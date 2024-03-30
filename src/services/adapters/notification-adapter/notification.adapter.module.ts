import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Space } from '@domain/challenge/space/space.entity';
import { Post } from '@domain/collaboration/post/post.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Community } from '@domain/community/community/community.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { User } from '@domain/community/user/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityModule } from '@src/platform/activity/activity.module';
import { NotificationAdapter } from './notification.adapter';
import { NotificationPayloadBuilder } from './notification.payload.builder';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator/url.generator.module';

@Module({
  imports: [
    ActivityModule,
    EntityResolverModule,
    UrlGeneratorModule,
    TypeOrmModule.forFeature([
      Space,
      Challenge,
      Opportunity,
      Post,
      Whiteboard,
      User,
      Organization,
      Community,
    ]),
  ],
  providers: [NotificationAdapter, NotificationPayloadBuilder],
  exports: [NotificationAdapter],
})
export class NotificationAdapterModule {}
