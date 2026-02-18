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
