import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([Aspect]),
  ],
  providers: [AspectResolverMutations, AspectService],
  exports: [AspectService],
})
export class AspectModule {}
