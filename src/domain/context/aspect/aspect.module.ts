import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationEngineModule } from '@src/services/authorization-engine/authorization-engine.module';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';

@Module({
  imports: [AuthorizationEngineModule, TypeOrmModule.forFeature([Aspect])],
  providers: [AspectResolverMutations, AspectService],
  exports: [AspectService],
})
export class AspectModule {}
