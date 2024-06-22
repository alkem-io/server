import { Post } from '@domain/collaboration/post/post.entity';
import { Whiteboard } from '@domain/common/whiteboard/whiteboard.entity';
import { Community } from '@domain/community/community/community.entity';
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
    TypeOrmModule.forFeature([Post, Whiteboard, Community]),
  ],
  providers: [NotificationAdapter, NotificationPayloadBuilder],
  exports: [NotificationAdapter],
})
export class NotificationAdapterModule {}
