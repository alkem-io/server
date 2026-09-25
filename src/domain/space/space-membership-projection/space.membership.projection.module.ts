import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { SpaceLookupModule } from '@domain/space/space.lookup/space.lookup.module';
import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { SpaceMembershipProjectionService } from './space.membership.projection.service';

@Module({
  imports: [ActorLookupModule, SpaceLookupModule, CommunicationAdapterModule],
  providers: [SpaceMembershipProjectionService],
  exports: [SpaceMembershipProjectionService],
})
export class SpaceMembershipProjectionModule {}
