import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResolverQueries } from './user.resolver.queries';
import { ProfileModule } from '@domain/community/profile/profile.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@domain/community/user';
import { UserResolverFields } from './user.resolver.fields';
import { UserResolverMutations } from './user.resolver.mutations';
import { CommunicationModule } from '@src/services/platform/communication/communication.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { NamingModule } from '@src/services/domain/naming/naming.module';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { UserAuthorizationService } from './user.service.authorization';

@Module({
  imports: [
    ProfileModule,
    forwardRef(() => CommunicationModule),
    AgentModule,
    NamingModule,
    AuthorizationEngineModule,
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
