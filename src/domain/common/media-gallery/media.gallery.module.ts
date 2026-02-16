import { AuthorizationModule } from '@core/authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { MediaGalleryResolverFields } from './media.gallery.resolver.fields';
import { MediaGalleryResolverMutations } from './media.gallery.resolver.mutations';
import { MediaGalleryService } from './media.gallery.service';
import { MediaGalleryAuthorizationService } from './media.gallery.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    StorageBucketModule,
    VisualModule,
  ],
  providers: [
    MediaGalleryService,
    MediaGalleryResolverFields,
    MediaGalleryResolverMutations,
    MediaGalleryAuthorizationService,
  ],
  exports: [
    MediaGalleryService,
    MediaGalleryAuthorizationService,
    MediaGalleryResolverFields,
  ],
})
export class MediaGalleryModule {}
