import { Module } from '@nestjs/common';
import { VirtualContributorMessageService } from './virtual.contributor.message.service';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';

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
