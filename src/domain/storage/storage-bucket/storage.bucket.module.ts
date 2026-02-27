import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Profile } from '@domain/common/profile/profile.entity';
import { ImageCompressionService } from '@domain/common/visual/image.compression.service';
import { ImageConversionService } from '@domain/common/visual/image.conversion.service';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
    AuthorizationModule,
    AuthorizationPolicyModule,
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
    ImageConversionService,
    ImageCompressionService,
  ],
  exports: [StorageBucketService, StorageBucketAuthorizationService],
})
export class StorageBucketModule {}
