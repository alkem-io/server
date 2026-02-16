import { OrganizationLookupModule } from '@domain/community/organization-lookup/organization.lookup.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import * as creators from './loader.creators';

@Module({
  imports: [UserLookupModule, OrganizationLookupModule],
  providers: Object.values(creators),
})
export class LoaderCreatorModule {}
