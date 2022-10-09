import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { UserAuthorizationService } from './user.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { IdentityResolverModule } from '@services/infrastructure/identity-resolver/identity.resolver.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';
import { KonfigModule } from '@src/platform/configuration/config/config.module';
import { ConfigModule } from '@nestjs/config';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PreferenceModule } from '@domain/common/preference';
import { UserDataloaderService } from './user.dataloader.service';
import { PlatformAuthorizationModule } from '@src/platform/authorization/platform.authorization.module';
import { NotificationAdapterModule } from '@services/adapters/notification-adapter/notification.adapter.module';

@Module({
  imports: [
    ProfileModule,
    NotificationAdapterModule,
    CommunicationAdapterModule,
    AgentModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    IdentityResolverModule,
    RoomModule,
    MicroservicesModule,
    PlatformAuthorizationModule,
    PreferenceModule,
    PreferenceSetModule,
    KonfigModule,
    TypeOrmModule.forFeature([User]),
    ConfigModule,
  ],
  providers: [
    UserService,
    UserAuthorizationService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
    UserDataloaderService,
  ],
  exports: [UserService, UserDataloaderService, UserAuthorizationService],
})
export class UserModule {}
