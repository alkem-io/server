import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualActorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationModule } from '@platform/in-app-notification/in.app.notification.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';
import { MessageModule } from '../message/message.module';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';
import { VirtualContributorMessageModule } from '../virtual.contributor.message/virtual.contributor.message.module';
import { RoomDataLoader } from './room.data.loader';
import { Room } from './room.entity';
import { RoomEventResolverSubscription } from './room.event.resolver.subscription';
import { RoomResolverFields } from './room.resolver.fields';
import { RoomResolverMutations } from './room.resolver.mutations';
import { RoomService } from './room.service';
import { RoomAuthorizationService } from './room.service.authorization';
import { RoomServiceEvents } from './room.service.events';

@Module({
  imports: [
    ActorLookupModule,
    ContributionReporterModule,
    ActivityAdapterModule,
    NotificationAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    NamingModule,
    CommunicationAdapterModule,
    EntityResolverModule,
    MessageModule,
    VirtualActorLookupModule,
    VirtualContributorMessageModule,
    UserLookupModule,
    RoomLookupModule,
    TypeOrmModule.forFeature([Room]),
    SubscriptionServiceModule,
    InAppNotificationModule,
  ],
  providers: [
    RoomService,
    RoomAuthorizationService,
    RoomResolverFields,
    RoomResolverMutations,
    RoomEventResolverSubscription,
    RoomServiceEvents,
    RoomDataLoader,
  ],
  exports: [RoomService, RoomServiceEvents, RoomAuthorizationService],
})
export class RoomModule {}
