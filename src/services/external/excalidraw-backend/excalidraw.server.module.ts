import { Module } from '@nestjs/common';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { ContributionReporterModule } from '@services/external/elasticsearch/contribution-reporter';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { ExcalidrawRedisServerFactoryProvider } from './adapters/redis';
import { ExcalidrawServer } from './excalidraw.server';

@Module({
  imports: [
    AuthenticationModule,
    WhiteboardRtModule,
    AuthorizationModule,
    ContributionReporterModule,
    EntityResolverModule,
  ],
  providers: [
    ExcalidrawRedisServerFactoryProvider,
    APP_ID_PROVIDER,
    ExcalidrawServer,
  ],
})
export class ExcalidrawServerModule {}
