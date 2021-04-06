import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorModule } from '@domain/context/actor/actor.module';
import { ActorGroup } from './actor-group.entity';
import { ActorGroupResolverMutations } from './actor-group.resolver.mutations';
import { ActorGroupService } from './actor-group.service';

@Module({
  imports: [ActorModule, TypeOrmModule.forFeature([ActorGroup])],
  providers: [ActorGroupService, ActorGroupResolverMutations],
  exports: [ActorGroupService],
})
export class ActorGroupModule {}
