import { AuthorizationModule } from '@core/authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter/contribution.reporter.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { MediaGallery } from './media.gallery.entity';
import { MediaGalleryResolverFields } from './media.gallery.resolver.fields';
import { MediaGalleryResolverMutations } from './media.gallery.resolver.mutations';
import { MediaGalleryService } from './media.gallery.service';
import { MediaGalleryAuthorizationService } from './media.gallery.service.authorization';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaGallery]),
    AuthorizationModule,
    AuthorizationPolicyModule,
    ContributionReporterModule,
    EntityResolverModule,
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
