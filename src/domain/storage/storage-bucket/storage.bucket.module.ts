import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IpfsModule } from '@services/adapters/ipfs/ipfs.module';
import { DocumentModule } from '../document/document.module';
import { StorageBucket } from './storage.bucket.entity';
import { StorageBucketResolverFields } from './storage.bucket.resolver.fields';
import { StorageBucketResolverMutations } from './storage.bucket.resolver.mutations';
import { StorageBucketService } from './storage.bucket.service';
import { StorageBucketAuthorizationService } from './storage.bucket.service.authorization';
import { VisualModule } from '@domain/common/visual/visual.module';
import { Document } from '../document/document.entity';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { StorageBucketResolverModule } from '@services/infrastructure/storage-bucket-resolver/storage.bucket.resolver.module';
import { Profile } from '@domain/common/profile/profile.entity';

@Module({
  imports: [
    DocumentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    IpfsModule,
    VisualModule,
    StorageBucketResolverModule,
    ReferenceModule,
    TypeOrmModule.forFeature([StorageBucket]),
    TypeOrmModule.forFeature([Document]),
    TypeOrmModule.forFeature([Profile]),
  ],
  providers: [
    StorageBucketResolverFields,
    StorageBucketService,
    StorageBucketResolverMutations,
    StorageBucketAuthorizationService,
  ],
  exports: [StorageBucketService, StorageBucketAuthorizationService],
})
export class StorageBucketModule {}
