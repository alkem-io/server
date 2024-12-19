import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user/user.entity';
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
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PreferenceModule } from '@domain/common/preference';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ContributorModule } from '../contributor/contributor.module';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { UserSettingsModule } from '../user.settings/user.settings.module';

@Module({
  imports: [
    ProfileModule,
    UserSettingsModule,
    NotificationAdapterModule,
    CommunicationAdapterModule,
    AgentModule,
    AccountHostModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    EntityResolverModule,
    RoomModule,
    MicroservicesModule,
    PlatformAuthorizationPolicyModule,
    PreferenceModule,
    PreferenceSetModule,
    StorageAggregatorModule,
    StorageBucketModule,
    DocumentModule,
    KratosModule,
    ContributorModule,
    TypeOrmModule.forFeature([User]),
  ],
  providers: [
    UserService,
    UserAuthorizationService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
  ],
  exports: [UserService, UserAuthorizationService],
})
export class UserModule {}
