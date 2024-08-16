import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';

@Module({
  imports: [AgentModule, ContributorLookupModule],
  providers: [AccountHostService],
  exports: [AccountHostService],
})
export class AccountHostModule {}
