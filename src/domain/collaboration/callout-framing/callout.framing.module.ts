import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LinkModule } from '@domain/collaboration/link/link.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { MediaGalleryModule } from '@domain/common/media-gallery/media.gallery.module';
import { MemoModule } from '@domain/common/memo';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { Module } from '@nestjs/common';
import { NamingModule } from '@services/infrastructure/naming/naming.module';
import { CalloutFramingResolverFields } from './callout.framing.resolver.fields';
import { CalloutFramingService } from './callout.framing.service';
import { CalloutFramingAuthorizationService } from './callout.framing.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    ProfileDocumentsModule,
    TagsetModule,
    WhiteboardModule,
    LinkModule,
    MemoModule,
    MediaGalleryModule,
    NamingModule,
  ],
  providers: [
    CalloutFramingService,
    CalloutFramingAuthorizationService,
    CalloutFramingResolverFields,
  ],
  exports: [CalloutFramingService, CalloutFramingAuthorizationService],
})
export class CalloutFramingModule {}
