import { AuthorizationModule } from '@core/authorization/authorization.module';
import { CredentialModule } from '@domain/actor/credential/credential.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { Actor } from './actor.entity';
import { ActorResolverMutations } from './actor.resolver.mutations';
import { ActorResolverQueries } from './actor.resolver.queries';
import { ActorService } from './actor.service';
import { ActorAuthorizationService } from './actor.service.authorization';

@Module({
  imports: [
    TypeOrmModule.forFeature([Actor]),
    AuthorizationPolicyModule,
    AuthorizationModule,
    CredentialModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [
    ActorService,
    ActorAuthorizationService,
    ActorResolverQueries,
    ActorResolverMutations,
  ],
  exports: [ActorService, ActorAuthorizationService],
})
export class ActorModule {}
