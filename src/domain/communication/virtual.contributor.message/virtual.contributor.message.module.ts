import { Module } from '@nestjs/common';
import { VirtualContributorMessageService } from './virtual.contributor.message.service';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { AiServerAdapterModule } from '@services/adapters/ai-server-adapter/ai.server.adapter.module';
import { VcInteractionModule } from '../vc-interaction/vc.interaction.module';

@Module({
  imports: [
    ContributorLookupModule,
    AiServerAdapterModule,
    VcInteractionModule,
  ],
  providers: [VirtualContributorMessageService],
  exports: [VirtualContributorMessageService],
})
export class VirtualContributorMessageModule {}
