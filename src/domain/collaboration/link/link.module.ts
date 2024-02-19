import { ProfileModule } from '@domain/common/profile/profile.module';
import { Module } from '@nestjs/common';
import { LinkService } from './link.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from './link.entity';
import { LinkAuthorizationService } from './link.service.authorization';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { LinkResolverFields } from './link.resolver.fields';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { LinkResolverMutations } from './link.resolver.mutations';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';

@Module({
  imports: [
    AuthorizationModule,
    AuthorizationPolicyModule,
    ProfileModule,
    DocumentModule,
    StorageBucketModule,
    TypeOrmModule.forFeature([Link]),
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
