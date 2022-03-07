import { CacheModule, Module } from '@nestjs/common';
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
import { UserPreferenceModule } from '../user-preferences';
import { KonfigModule } from '@services/platform/configuration/config/config.module';
import { ConfigModule } from '@nestjs/config';

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
    UserPreferenceModule,
    KonfigModule,
    TypeOrmModule.forFeature([User]),
    CacheModule.register({ max: 250, ttl: 300 }),
    ConfigModule,
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
