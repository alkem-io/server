import { Module } from '@nestjs/common';
import { ActorModule as ActorCoreModule } from './actor/actor.module';

/**
 * Barrel module for Actor domain.
 * Exports all actor-related modules for use in the application.
 */
@Module({
  imports: [ActorCoreModule],
  exports: [ActorCoreModule],
})
export class ActorModule {}
