import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AdminStorageService } from './admin.storage.service';
import { AdminStorageResolverMutations } from './admin.storage.resolver.mutations';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    EntityResolverModule,
    IpfsModule,
    StorageBucketModule,
  ],
  providers: [AdminStorageService, AdminStorageResolverMutations],
  exports: [AdminStorageService],
})
export class AdminStorageModule {}
