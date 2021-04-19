import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Aspect } from './aspect.entity';
import { AspectResolverMutations } from './aspect.resolver.mutations';
import { AspectService } from './aspect.service';

@Module({
  imports: [TypeOrmModule.forFeature([Aspect])],
  providers: [AspectResolverMutations, AspectService],
  exports: [AspectService],
})
export class AspectModule {}
