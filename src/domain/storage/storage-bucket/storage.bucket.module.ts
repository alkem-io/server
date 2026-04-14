import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Profile } from '@domain/common/profile/profile.entity';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { Document } from '../document/document.entity';
import { DocumentModule } from '../document/document.module';
import { StorageBucket } from './storage.bucket.entity';
import { StorageBucketResolverFields } from './storage.bucket.resolver.fields';
import { StorageBucketResolverMutations } from './storage.bucket.resolver.mutations';
import { StorageBucketService } from './storage.bucket.service';
import { StorageBucketAuthorizationService } from './storage.bucket.service.authorization';

@Module({
  imports: [
    AvatarCreatorModule,
    DocumentModule,
    FileServiceAdapterModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
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
