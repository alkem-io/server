import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserAuthorizationService } from './user.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PreferenceModule } from '@domain/common/preference';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import {
  AgentLoaderCreator,
  ProfileLoaderCreator,
} from '@core/dataloader/creators/loader.creators';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { UserStorageAggregatorLoaderCreator } from '@core/dataloader/creators/loader.creators/community/user.storage.aggregator.loader.creator';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { AvatarModule } from '@domain/common/visual/avatar.module';

@Module({
  imports: [
    ProfileModule,
    NotificationAdapterModule,
    CommunicationAdapterModule,
    AgentModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    EntityResolverModule,
    RoomModule,
    MicroservicesModule,
    PlatformAuthorizationPolicyModule,
    PreferenceModule,
    PreferenceSetModule,
    KonfigModule,
    MessagingModule,
    StorageAggregatorModule,
    StorageBucketModule,
    DocumentModule,
    AvatarModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    UserService,
    UserAuthorizationService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
    AgentLoaderCreator,
    ProfileLoaderCreator,
    UserStorageAggregatorLoaderCreator,
  ],
  exports: [UserService, UserAuthorizationService],
})
export class UserModule {}
