import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AdminStorageService } from './admin.storage.service';
import { AdminStorageResolverMutations } from './admin.storage.resolver.mutations';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { StorageBucketResolverModule } from '@services/infrastructure/storage-bucket-resolver/storage.bucket.resolver.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    StorageBucketResolverModule,
    IpfsModule,
    StorageBucketModule,
  ],
  providers: [AdminStorageService, AdminStorageResolverMutations],
  exports: [AdminStorageService],
})
export class AdminStorageModule {}
