import { Module } from '@nestjs/common';
import { ContributorLookupService } from './contributor.lookup.service';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [UserLookupModule],
  providers: [ContributorLookupService],
  exports: [ContributorLookupService],
})
export class ContributorLookupModule {}
