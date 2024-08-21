import { Module } from '@nestjs/common';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ContributorService } from './contributor.service';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';

@Module({
  imports: [
    ProfileModule,
    ContributorLookupModule,
    AvatarCreatorModule,
    StorageBucketModule,
  ],
  providers: [ContributorService],
  exports: [ContributorService],
})
export class ContributorModule {}
