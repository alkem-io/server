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
import { CommunicationAdapterModule } from '@services/platform/communication-adapter/communication-adapter.module';
import { IdentityResolverModule } from '@domain/communication/identity-resolver/identity.resolver.module';
import { RoomModule } from '@domain/communication/room/room.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';
import { KonfigModule } from '@services/platform/configuration/config/config.module';
import { ConfigModule } from '@nestjs/config';
import { PreferenceSetModule } from '@domain/common/preference-set/preference.set.module';
import { PreferenceModule } from '@domain/common/preference';
import { UserDataloaderService } from './user.dataloader.service';

@Module({
  imports: [
    ProfileModule,
    CommunicationAdapterModule,
    AgentModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    IdentityResolverModule,
    RoomModule,
    MicroservicesModule,
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
