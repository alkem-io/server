import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/adapters/communication-adapter/communication-adapter.module';
import { RoomLookupService } from './room.lookup.service';

// Module created to be able to avoid a circular dependency, but the proper solution is
// a bigger refactoring...
@Module({
  imports: [CommunicationAdapterModule],
  providers: [RoomLookupService],
  exports: [RoomLookupService],
})
export class RoomLookupModule {}
