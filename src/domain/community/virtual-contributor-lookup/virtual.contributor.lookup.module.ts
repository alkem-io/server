import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { VirtualContributorLookupService } from './virtual.contributor.lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualContributor])], // Important this is empty!
  providers: [VirtualContributorLookupService],
  exports: [VirtualContributorLookupService],
})
export class VirtualContributorLookupModule {}
