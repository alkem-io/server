import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorModule } from '../actor/actor.module';
import { ActorGroup } from './actor-group.entity';
import { ActorGroupResolver } from './actor-group.resolver';
import { ActorGroupService } from './actor-group.service';

@Module({
  imports: [ActorModule, TypeOrmModule.forFeature([ActorGroup])],
  providers: [ActorGroupService, ActorGroupResolver],
  exports: [ActorGroupService],
})
export class ActorGroupModule {}
