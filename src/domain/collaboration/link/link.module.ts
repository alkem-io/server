import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { LinkResolverFields } from './link.resolver.fields';
import { LinkResolverMutations } from './link.resolver.mutations';
import { LinkService } from './link.service';
import { LinkAuthorizationService } from './link.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    DocumentModule,
    StorageBucketModule,
  ],
  providers: [
    LinkResolverMutations,
    LinkService,
    LinkAuthorizationService,
    LinkResolverFields,
  ],
  exports: [LinkService, LinkAuthorizationService],
})
export class LinkModule {}
