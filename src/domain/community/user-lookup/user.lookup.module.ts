import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { UserLookupService } from './user.lookup.service';

@Module({
  imports: [ActorLookupModule],
  providers: [UserLookupService],
  exports: [UserLookupService],
})
export class UserLookupModule {}
