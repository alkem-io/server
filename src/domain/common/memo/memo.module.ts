import { AuthorizationModule } from '@core/authorization/authorization.module';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { LicenseModule } from '../license/license.module';
import { ProfileModule } from '../profile/profile.module';
import { MemoResolverFields } from './memo.resolver.fields';
import { MemoResolverMutations } from './memo.resolver.mutations';
import { MemoService } from './memo.service';
import { MemoAuthorizationService } from './memo.service.authorization';

@Module({
  imports: [
    EntityResolverModule,
    AuthorizationModule,
    AuthorizationPolicyModule,
    LicenseModule,
    VisualModule,
    ProfileModule,
    UserModule,
    StorageBucketModule,
    ProfileDocumentsModule,
  ],
  providers: [
    MemoService,
    MemoAuthorizationService,
    MemoResolverMutations,
    MemoResolverFields,
  ],
  exports: [
    MemoService,
    MemoAuthorizationService,
    MemoResolverMutations,
    MemoResolverFields,
  ],
})
export class MemoModule {}
