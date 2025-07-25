import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VisualModule } from '@domain/common/visual/visual.module';
import { UserModule } from '@domain/community/user/user.module';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '../authorization-policy/authorization.policy.module';
import { ProfileModule } from '../profile/profile.module';
import { Memo } from './memo.entity';
import { MemoResolverFields } from './memo.resolver.fields';
import { MemoResolverMutations } from './memo.resolver.mutations';
import { MemoService } from './memo.service';
import { MemoAuthorizationService } from './memo.service.authorization';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { ProfileDocumentsModule } from '@domain/profile-documents/profile.documents.module';
import { LicenseModule } from '../license/license.module';

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
    TypeOrmModule.forFeature([Memo]),
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
