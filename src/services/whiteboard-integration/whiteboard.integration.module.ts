import { Module } from '@nestjs/common';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { WhiteboardModule } from '@domain/common/whiteboard';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { WhiteboardIntegrationService } from './whiteboard.integration.service';
import { WhiteboardIntegrationController } from './whiteboard.integration.controller';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ActivityAdapterModule } from '@services/adapters/activity-adapter/activity.adapter.module';

@Module({
  imports: [
    AuthorizationModule,
    WhiteboardModule,
    UserModule,
    AuthenticationModule,
    ContributionReporterModule,
    EntityResolverModule,
    ActivityAdapterModule,
  ],
  providers: [WhiteboardIntegrationService],
  controllers: [WhiteboardIntegrationController],
})
export class WhiteboardIntegrationModule {}
