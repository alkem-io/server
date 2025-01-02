import { Module } from '@nestjs/common';
import { VirtualContributorLookupService } from './virtual.contributor.lookup.service';

@Module({
  imports: [], // Important this is empty!
  providers: [VirtualContributorLookupService],
  exports: [VirtualContributorLookupService],
})
export class VirtualContributorLookupModule {}
