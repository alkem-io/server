import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { WhiteboardIntegrationService } from './whiteboard.integration.service';
import { WhiteboardIntegrationController } from './whiteboard.integration.controller';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [
    AuthorizationModule,
    WhiteboardModule,
    AuthenticationAgentInfoModule,
    AuthenticationModule,
    ContributionReporterModule,
    EntityResolverModule,
    ActivityAdapterModule,
    UserLookupModule,
  ],
  providers: [WhiteboardIntegrationService],
  controllers: [WhiteboardIntegrationController],
})
export class WhiteboardIntegrationModule {}
