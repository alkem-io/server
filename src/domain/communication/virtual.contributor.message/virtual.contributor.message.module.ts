import { Module } from '@nestjs/common';
import { VirtualContributorMessageService } from './virtual.contributor.message.service';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { VcInteractionModule } from '../vc-interaction/vc.interaction.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';

@Module({
  imports: [
    VirtualContributorLookupModule,
    AiServerAdapterModule,
    VcInteractionModule,
  ],
  providers: [VirtualContributorMessageService],
  exports: [VirtualContributorMessageService],
})
export class VirtualContributorMessageModule {}
