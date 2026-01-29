import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { ContributorModule } from '@domain/community/contributor/contributor.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AdminSearchContributorsMutations } from './admin.avatarresolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    ContributorModule,
    ProfileModule,
    StorageBucketModule,
  ],
  providers: [AdminSearchContributorsMutations],
  exports: [],
})
export class AdminContributorsModule {}
