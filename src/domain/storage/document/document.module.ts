import { AuthorizationModule } from '@core/authorization/authorization.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageServiceModule } from '@services/adapters/storage';
import { Document } from './document.entity';
import { DocumentResolverFields } from './document.resolver.fields';
import { DocumentResolverMutations } from './document.resolver.mutations';
import { DocumentService } from './document.service';
import { DocumentAuthorizationService } from './document.service.authorization';

@Module({
  imports: [
    AuthorizationPolicyModule,
    AuthorizationModule,
    TagsetModule,
    UserLookupModule,
    StorageServiceModule,
    TypeOrmModule.forFeature([Document]),
  ],
  providers: [
    DocumentResolverMutations,
    DocumentService,
    DocumentAuthorizationService,
    DocumentResolverFields,
  ],
  exports: [DocumentService, DocumentAuthorizationService],
})
export class DocumentModule {}
