import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { Module } from '@nestjs/common';
import { AvatarCreatorModule } from '@services/external/avatar-creator/avatar.creator.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { DocumentModule } from '../document/document.module';
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
