import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { Module } from '@nestjs/common';
import { AccountHostService } from './account.host.service';

@Module({
  imports: [ContributorModule],
  providers: [AccountHostService],
  exports: [AccountHostService],
})
export class AccountHostModule {}
