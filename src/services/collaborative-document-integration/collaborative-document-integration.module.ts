import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { CollaboraDocumentModule } from '@domain/collaboration/collabora-document/collabora.document.module';
import { MemoModule } from '@domain/common/memo';
import { Module } from '@nestjs/common';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CollaborativeDocumentIntegrationController } from './collaborative-document-integration.controller';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';

@Module({
  imports: [
    AuthorizationModule,
    ActorContextModule,
    ActorLookupModule,
    MemoModule,
    CollaboraDocumentModule,
    ContributionReporterModule,
    EntityResolverModule,
  ],
  controllers: [CollaborativeDocumentIntegrationController],
  providers: [CollaborativeDocumentIntegrationService],
  exports: [CollaborativeDocumentIntegrationService],
})
export class CollaborativeDocumentIntegrationModule {}
