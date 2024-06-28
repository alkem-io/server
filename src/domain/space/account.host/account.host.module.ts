import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';
import { AgentModule } from '@domain/agent/agent/agent.module';

@Module({
  imports: [ContributorModule, AgentModule],
  providers: [AccountHostService],
  exports: [AccountHostService],
})
export class AccountHostModule {}
