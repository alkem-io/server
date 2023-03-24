import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from './callout.entity';
import { AspectModule } from '../aspect/aspect.module';
import { CanvasModule } from '@domain/common/canvas/canvas.module';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CommentsModule } from '@domain/communication/comments/comments.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { AspectTemplateModule } from '@domain/template/aspect-template/aspect.template.module';
import { CanvasTemplateModule } from '@domain/template/canvas-template/canvas.template.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CommunityPolicyModule } from '@domain/community/community-policy/community.policy.module';
import { UserModule } from '@domain/community/user/user.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { ElasticsearchModule } from '@services/external/elasticsearch';
import { ProfileModule } from '@domain/common/profile/profile.module';

@Module({
  imports: [
    EntityResolverModule,
    ElasticsearchModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    AspectModule,
    CanvasModule,
    CommentsModule,
    CommunityPolicyModule,
    EntityResolverModule,
    UserModule,
    NamingModule,
    ProfileModule,
    AspectTemplateModule,
    CanvasTemplateModule,
    MessagingModule,
    TypeOrmModule.forFeature([Callout]),
  ],
  providers: [
    CalloutResolverMutations,
    CalloutService,
    CalloutAuthorizationService,
    CalloutResolverFields,
    CalloutResolverSubscriptions,
  ],
  exports: [CalloutService, CalloutAuthorizationService],
})
export class CalloutModule {}
