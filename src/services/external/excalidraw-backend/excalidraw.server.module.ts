import { Module } from '@nestjs/common';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { ExcalidrawRedisServerFactoryProvider } from './adapters/redis';
import { ExcalidrawServer } from './excalidraw.server';

@Module({
  imports: [AuthenticationModule, WhiteboardRtModule, AuthorizationModule],
  providers: [
    ExcalidrawRedisServerFactoryProvider,
    APP_ID_PROVIDER,
    ExcalidrawServer,
  ],
})
export class ExcalidrawServerModule {}
