import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actor } from './actor.entity';
import { ActorService } from './actor.service';
import { ActorResolverQueries } from './actor.resolver.queries';
import { ActorResolverMutations } from './actor.resolver.mutations';
import { CredentialModule } from '@domain/actor/credential/credential.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Actor]),
    AuthorizationPolicyModule,
    AuthorizationModule,
    CredentialModule,
    PlatformAuthorizationPolicyModule,
  ],
  providers: [ActorService, ActorResolverQueries, ActorResolverMutations],
  exports: [ActorService],
})
export class ActorModule {}
