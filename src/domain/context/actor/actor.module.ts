import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Actor } from './actor.entity';
import { ActorResolver } from './actor.resolver';
import { ActorService } from './actor.service';

@Module({
  imports: [TypeOrmModule.forFeature([Actor])],
  providers: [ActorService, ActorResolver],
  exports: [ActorService],
})
export class ActorModule {}
