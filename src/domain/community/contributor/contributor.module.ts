import { ProfileModule } from '@domain/common/profile/profile.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { ContributorService } from './contributor.service';

@Module({
  imports: [
    ProfileModule,
    ContributorLookupModule,
    AvatarCreatorModule,
    DocumentModule,
    StorageBucketModule,
  ],
  providers: [ContributorService],
  exports: [ContributorService],
})
export class ContributorModule {}
