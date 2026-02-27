import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { VirtualActorLookupService } from './virtual.contributor.lookup.service';

@Module({
  imports: [ActorLookupModule, TypeOrmModule.forFeature([VirtualContributor])],
  providers: [VirtualActorLookupService],
  exports: [VirtualActorLookupService],
})
export class VirtualActorLookupModule {}
