import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { AuthorizationPolicyModule } from '@domain/common/authorization-policy/authorization.policy.module';
import { ProfileModule } from '@domain/common/profile/profile.module';
import { DocumentModule } from '@domain/storage/document/document.module';
import { StorageAggregatorModule } from '@domain/storage/storage-aggregator/storage.aggregator.module';
import { StorageBucketModule } from '@domain/storage/storage-bucket/storage.bucket.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileServiceAdapterModule } from '@services/adapters/file-service-adapter/file.service.adapter.module';
import { WopiServiceAdapterModule } from '@services/adapters/wopi-service-adapter/wopi.service.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CollaboraDocument } from './collabora.document.entity';
import { CollaboraDocumentResolverFields } from './collabora.document.resolver.fields';
import { CollaboraDocumentResolverMutations } from './collabora.document.resolver.mutations';
import { CollaboraDocumentResolverQueries } from './collabora.document.resolver.queries';
import { CollaboraDocumentService } from './collabora.document.service';
import { CollaboraDocumentAuthorizationService } from './collabora.document.service.authorization';

@Module({
  imports: [
    AuthorizationModule,
    ActorLookupModule,
    AuthorizationPolicyModule,
    DocumentModule,
    ProfileModule,
    StorageAggregatorModule,
    StorageBucketModule,
    WopiServiceAdapterModule,
    FileServiceAdapterModule,
    ContributionReporterModule,
    EntityResolverModule,
    TypeOrmModule.forFeature([CollaboraDocument]),
  ],
  providers: [
    CollaboraDocumentService,
    CollaboraDocumentAuthorizationService,
    CollaboraDocumentResolverFields,
    CollaboraDocumentResolverMutations,
    CollaboraDocumentResolverQueries,
  ],
  exports: [CollaboraDocumentService, CollaboraDocumentAuthorizationService],
})
export class CollaboraDocumentModule {}
