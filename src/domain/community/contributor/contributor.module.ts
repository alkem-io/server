import { Module } from '@nestjs/common';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ContributorService } from './contributor.service';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';

@Module({
  imports: [ProfileModule, ContributorLookupModule, AvatarCreatorModule],
  providers: [ContributorService],
  exports: [ContributorService],
})
export class ContributorModule {}
