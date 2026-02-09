import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { Module } from '@nestjs/common';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { WhiteboardIntegrationController } from './whiteboard.integration.controller';
import { WhiteboardIntegrationService } from './whiteboard.integration.service';

@Module({
  imports: [
    AuthorizationModule,
    WhiteboardModule,
    AuthenticationAgentInfoModule,
    AuthenticationModule,
    ContributionReporterModule,
    EntityResolverModule,
    ActivityAdapterModule,
  ],
  providers: [WhiteboardIntegrationService],
  controllers: [WhiteboardIntegrationController],
})
export class WhiteboardIntegrationModule {}
