import { Module } from '@nestjs/common';
import { OrganizationLookupService } from './organization.lookup.service';

@Module({
  imports: [], // Important this is empty!
  providers: [OrganizationLookupService],
  exports: [OrganizationLookupService],
})
export class OrganizationLookupModule {}
