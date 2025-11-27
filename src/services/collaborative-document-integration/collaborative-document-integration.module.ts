import { Module } from '@nestjs/common';
import { MemoModule } from '@domain/common/memo';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { CollaborativeDocumentIntegrationController } from './collaborative-document-integration.controller';
import { CollaborativeDocumentIntegrationService } from './collaborative-document-integration.service';

@Module({
  imports: [
    AuthorizationModule,
    AuthenticationModule,
    AuthenticationAgentInfoModule,
    MemoModule,
    ContributionReporterModule,
    EntityResolverModule,
    UserLookupModule,
  ],
  controllers: [CollaborativeDocumentIntegrationController],
  providers: [CollaborativeDocumentIntegrationService],
  exports: [CollaborativeDocumentIntegrationService],
})
export class CollaborativeDocumentIntegrationModule {}
