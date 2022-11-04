import { AuthorizationPolicyModule } from '../../common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Callout } from './callout.entity';
import { AspectModule } from '../aspect/aspect.module';
import { CanvasModule } from '../../common/canvas/canvas.module';
import { CalloutResolverMutations } from './callout.resolver.mutations';
import { CalloutService } from './callout.service';
import { CalloutAuthorizationService } from './callout.service.authorization';
import { CalloutResolverFields } from './callout.resolver.fields';
import { CalloutResolverSubscriptions } from './callout.resolver.subscriptions';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CommentsModule } from '../../communication/comments/comments.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { AspectTemplateModule } from '../../template/aspect-template/aspect.template.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';

@Module({
  imports: [
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    AspectModule,
    CanvasModule,
    CommentsModule,
    EntityResolverModule,
    NamingModule,
    AspectTemplateModule,
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
