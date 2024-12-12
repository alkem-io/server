import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferenceModule } from '@domain/common/reference/reference.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { Profile } from './profile.entity';
import { ProfileResolverMutations } from './profile.resolver.mutations';
import { ProfileService } from './profile.service';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ProfileAuthorizationService } from './profile.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { ProfileResolverFields } from './profile.resolver.fields';
import { LocationModule } from '@domain/common/location';
import { TagsetTemplateModule } from '../tagset-template/tagset.template.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { DocumentModule } from '@domain/storage/document/document.module';
import { ProfileVisualsService } from './profile.visuals.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    TagsetModule,
    TagsetTemplateModule,
    ReferenceModule,
    TypeOrmModule.forFeature([Profile]),
    VisualModule,
    LocationModule,
    StorageBucketModule,
    DocumentModule,
    UrlGeneratorModule,
  ],
  providers: [
    ProfileResolverMutations,
    ProfileService,
    ProfileVisualsService,
    ProfileAuthorizationService,
    ProfileResolverFields,
  ],
  exports: [
    ProfileService,
    ProfileVisualsService,
    ProfileAuthorizationService,
    ProfileResolverFields,
  ],
})
export class ProfileModule {}
