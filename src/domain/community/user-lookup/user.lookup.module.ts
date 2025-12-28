import { Module } from '@nestjs/common';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { UserLookupService } from './user.lookup.service';

@Module({
  imports: [ActorLookupModule],
  providers: [UserLookupService],
  exports: [UserLookupService],
})
export class UserLookupModule {}
