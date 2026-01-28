import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { MicroservicesModule } from '@core/microservices/microservices.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { MessagingModule } from '@domain/communication/messaging/messaging.module';
import { User } from '@domain/community/user/user.entity';
import { AccountHostModule } from '@domain/space/account.host/account.host.module';
import { AccountLookupModule } from '@domain/space/account.lookup/account.lookup.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { PlatformAuthorizationPolicyModule } from '@src/platform/authorization/platform.authorization.policy.module';
import { ContributorModule } from '../contributor/contributor.module';
import { UserAuthenticationLinkModule } from '../user-authentication-link/user.authentication.link.module';
import { UserLookupModule } from '../user-lookup/user.lookup.module';
import { UserSettingsModule } from '../user-settings/user.settings.module';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { UserResolverQueries } from './user.resolver.queries';
import { UserService } from './user.service';
import { UserAuthorizationService } from './user.service.authorization';

@Module({
  imports: [
    ProfileModule,
    UserSettingsModule,
    CommunicationAdapterModule,
    AgentModule,
    AuthenticationAgentInfoModule,
    AccountHostModule,
    AccountLookupModule,
    UserLookupModule,
    UserAuthenticationLinkModule,
    NamingModule,
    AuthorizationPolicyModule,
    AuthorizationModule,
    EntityResolverModule,
    MicroservicesModule,
    PlatformAuthorizationPolicyModule,
    StorageAggregatorModule,
    StorageBucketModule,
    DocumentModule,
    KratosModule,
    ContributorModule,
    MessagingModule,
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
