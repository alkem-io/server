import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MediaGallery } from './media.gallery.entity';
import { MediaGalleryService } from './media.gallery.service';
import { MediaGalleryAuthorizationService } from './media.gallery.service.authorization';
import { MediaGalleryResolverFields } from './media.gallery.resolver.fields';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileModule } from '../profile/profile.module';
import { VisualModule } from '../visual/visual.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MediaGallery]),
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    VisualModule,
  ],
  providers: [
    MediaGalleryService,
    MediaGalleryResolverFields,
    MediaGalleryAuthorizationService,
  ],
  exports: [
    MediaGalleryService,
    MediaGalleryAuthorizationService,
    MediaGalleryResolverFields,
  ],
})
export class MediaGalleryModule {}
