import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { ExcalidrawServerFactoryProvider } from './excalidraw.server.factory.provider';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthorizationModule } from '@core/authorization/authorization.module';

@Module({
  imports: [AuthenticationModule, WhiteboardRtModule, AuthorizationModule],
  providers: [ExcalidrawServerFactoryProvider],
})
export class ExcalidrawServerModule {}
