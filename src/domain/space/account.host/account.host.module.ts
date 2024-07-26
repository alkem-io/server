import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';

@Module({
  imports: [ContributorModule, AgentModule, ContributorLookupModule],
  providers: [AccountHostService, ContributorService],
  exports: [AccountHostService],
})
export class AccountHostModule {}
