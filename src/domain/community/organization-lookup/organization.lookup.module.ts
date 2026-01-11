import { Module } from '@nestjs/common';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { OrganizationLookupService } from './organization.lookup.service';

@Module({
  imports: [ActorLookupModule],
  providers: [OrganizationLookupService],
  exports: [OrganizationLookupService],
})
export class OrganizationLookupModule {}
