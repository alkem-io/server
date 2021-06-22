import { AuthorizationDefinitionModule } from '@domain/common/authorization-definition/authorization.definition.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/platform/authorization-engine/authorization-engine.module';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';

@Module({
  imports: [
    AuthorizationDefinitionModule,
    AuthorizationEngineModule,
    TypeOrmModule.forFeature([Aspect]),
  ],
  providers: [AspectResolverMutations, AspectService],
  exports: [AspectService],
})
export class AspectModule {}
