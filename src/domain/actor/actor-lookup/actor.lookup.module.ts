import { Module } from '@nestjs/common';
import { ActorLookupService } from './actor.lookup.service';
import { ActorTypeCacheService } from './actor.lookup.service.cache';

@Module({
  imports: [],
  providers: [ActorLookupService, ActorTypeCacheService],
  exports: [ActorLookupService, ActorTypeCacheService],
})
export class ActorLookupModule {}
