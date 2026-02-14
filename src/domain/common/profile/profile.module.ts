import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LocationModule } from '@domain/common/location';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { TagsetTemplateModule } from '../tagset-template/tagset.template.module';
import { ProfileResolverFields } from './profile.resolver.fields';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { ProfileService } from './profile.service';
import { ProfileAuthorizationService } from './profile.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
    TagsetTemplateModule,
    ReferenceModule,
    VisualModule,
    LocationModule,
    StorageBucketModule,
    ProfileDocumentsModule,
    DocumentModule,
    UrlGeneratorModule,
  ],
  providers: [
    ProfileResolverMutations,
    ProfileService,
    ProfileAuthorizationService,
    ProfileResolverFields,
  ],
  exports: [ProfileService, ProfileAuthorizationService, ProfileResolverFields],
})
export class ProfileModule {}
