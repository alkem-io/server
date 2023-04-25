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
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { Document } from '../document/document.entity';
import { ReferenceModule } from '@domain/common/reference/reference.module';

@Module({
  imports: [
    DocumentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    IpfsModule,
    VisualModule,
    EntityResolverModule,
    ReferenceModule,
    TypeOrmModule.forFeature([StorageBucket]),
    TypeOrmModule.forFeature([Document]),
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
