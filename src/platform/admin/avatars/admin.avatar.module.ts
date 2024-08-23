import { Module } from '@nestjs/common';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { AdminSearchContributorsMutations } from './admin.avatarresolver.mutations';

@Module({
  imports: [ContributorModule],
  providers: [AdminSearchContributorsMutations],
  exports: [],
})
export class AdminContributorsModule {}
