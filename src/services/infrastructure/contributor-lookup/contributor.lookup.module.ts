import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { ContributorLookupService } from './contributor.lookup.service';

@Module({
  imports: [UserLookupModule],
  providers: [ContributorLookupService],
  exports: [ContributorLookupService],
})
export class ContributorLookupModule {}
