import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { Module } from '@nestjs/common';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';
import { VirtualContributorMessageService } from './virtual.contributor.message.service';

@Module({
  imports: [
    VirtualContributorLookupModule,
    AiServerAdapterModule,
    RoomLookupModule,
  ],
  providers: [VirtualContributorMessageService],
  exports: [VirtualContributorMessageService],
})
export class VirtualContributorMessageModule {}
