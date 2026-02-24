import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorModule } from '@domain/actor/actor/actor.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AdminSearchContributorsMutations } from './admin.avatarresolver.mutations';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    PlatformAuthorizationPolicyModule,
    ActorModule,
    ProfileModule,
    StorageBucketModule,
  ],
  providers: [AdminSearchContributorsMutations],
  exports: [],
})
export class AdminContributorsModule {}
