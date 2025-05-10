import { Module } from '@nestjs/common';
import { VirtualContributorLookupService } from './virtual.contributor.lookup.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualContributor])], // Important this is empty!
  providers: [VirtualContributorLookupService],
  exports: [VirtualContributorLookupService],
})
export class VirtualContributorLookupModule {}
