import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { ActorContextCacheService } from './actor.context.cache.service';
import { ActorContextService } from './actor.context.service';

@Module({
  imports: [ActorLookupModule],
  providers: [ActorContextService, ActorContextCacheService],
  exports: [ActorContextService, ActorContextCacheService],
})
export class ActorContextModule {}
