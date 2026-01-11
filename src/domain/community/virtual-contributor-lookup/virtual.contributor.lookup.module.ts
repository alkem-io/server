import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { VirtualContributorLookupService } from './virtual.contributor.lookup.service';

@Module({
  imports: [TypeOrmModule.forFeature([VirtualContributor]), ActorLookupModule],
  providers: [VirtualContributorLookupService],
  exports: [VirtualContributorLookupService],
})
export class VirtualContributorLookupModule {}
