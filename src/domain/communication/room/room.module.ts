import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { RoomResolverFields } from './room.resolver.fields';
import { RoomResolverMutations } from './room.resolver.mutations';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';
import { MessagingModule } from '../messaging/messaging.module';
import { Room } from './room.entity';
import { RoomServiceEvents } from './room.service.events';
import { RoomEventResolverSubscription } from './room.event.resolver.subscription';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { VirtualContributorModule } from '@domain/community/virtual-contributor/virtual.contributor.module';
import { VirtualPersonaModule } from '@services/ai-server/ai-persona-service/virtual.persona.module';

@Module({
  imports: [
    EntityResolverModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    RoomModule,
    CommunicationAdapterModule,
    MessagingModule,
    VirtualPersonaModule,
    VirtualContributorModule,
    TypeOrmModule.forFeature([Room]),
    SubscriptionServiceModule,
  ],
  providers: [
    RoomService,
    RoomAuthorizationService,
    RoomResolverFields,
    RoomResolverMutations,
    RoomEventResolverSubscription,
    RoomServiceEvents,
  ],
  exports: [RoomService, RoomServiceEvents, RoomAuthorizationService],
})
export class RoomModule {}
