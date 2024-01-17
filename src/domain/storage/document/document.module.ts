import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { TagsetModule } from '@domain/common/tagset/tagset.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { UserLookupModule } from '@services/infrastructure/user-lookup/user.lookup.module';
import { StorageServiceModule } from '@services/adapters/storage';
import { Document } from './document.entity';
import { DocumentResolverMutations } from './document.resolver.mutations';
import { DocumentService } from './document.service';
import { DocumentResolverFields } from './document.resolver.fields';
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
