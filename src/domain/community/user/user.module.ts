import { CacheModule, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { UserResolverSubscriptions } from './user.resolver.subscriptions';
import { CommunicationModule } from '@src/services/platform/communication/communication.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { UserAuthorizationService } from './user.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { SubscriptionModule } from '@services/platform/subscription/subscription.module';

@Module({
  imports: [
    ProfileModule,
    CommunicationModule,
    AgentModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([User]),
    SubscriptionModule,
    CacheModule.register({ max: 250, ttl: 300 }),
  ],
  providers: [
    UserService,
    UserAuthorizationService,
    UserResolverMutations,
    UserResolverQueries,
    UserResolverFields,
    UserResolverSubscriptions,
  ],
  exports: [UserService, UserAuthorizationService],
})
export class UserModule {}
