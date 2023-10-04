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
