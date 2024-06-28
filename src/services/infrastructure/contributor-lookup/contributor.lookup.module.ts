import { Module } from '@nestjs/common';
import { ContributorLookupService } from './contributor.lookup.service';

@Module({
  imports: [],
  providers: [ContributorLookupService],
  exports: [ContributorLookupService],
})
export class ContributorLookupModule {}
