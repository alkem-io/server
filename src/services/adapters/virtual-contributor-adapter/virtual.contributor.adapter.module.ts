import { Module } from '@nestjs/common';
import { VirtualContributorAdapter } from './virtual.contributor.adapter';

@Module({
  providers: [VirtualContributorAdapter],
  exports: [VirtualContributorAdapter],
})
export class VirtualContributorAdapterModule {}
