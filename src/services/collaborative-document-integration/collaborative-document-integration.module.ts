import { Module } from '@nestjs/common';
import { MemoModule } from '@domain/common/memo';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { ActorContextModule } from '@core/actor-context';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { CollaborativeDocumentIntegrationController } from './collaborative-document-integration.controller';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthenticationModule,
    ActorContextModule,
    MemoModule,
    ContributionReporterModule,
    EntityResolverModule,
  ],
  controllers: [CollaborativeDocumentIntegrationController],
  providers: [CollaborativeDocumentIntegrationService],
  exports: [CollaborativeDocumentIntegrationService],
})
export class CollaborativeDocumentIntegrationModule {}
