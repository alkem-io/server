import { Module } from '@nestjs/common';
import { ActorLookupService } from './actor.lookup.service';

@Module({
  imports: [],
  providers: [ActorLookupService],
  exports: [ActorLookupService],
})
export class ActorLookupModule {}
