import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentModule } from '../document/document.module';
import { StorageBucket } from './storage.bucket.entity';
import { StorageBucketResolverFields } from './storage.bucket.resolver.fields';
import { StorageBucketResolverMutations } from './storage.bucket.resolver.mutations';
import { StorageBucketService } from './storage.bucket.service';
import { StorageBucketAuthorizationService } from './storage.bucket.service.authorization';
import { VisualModule } from '@domain/common/visual/visual.module';
import { Document } from '../document/document.entity';
import { Profile } from '@domain/common/profile/profile.entity';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';

@Module({
  imports: [
    DocumentModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    VisualModule,
    UrlGeneratorModule,
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
