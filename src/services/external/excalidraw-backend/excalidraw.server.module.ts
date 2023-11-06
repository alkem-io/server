import { Module } from '@nestjs/common';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { ExcalidrawRedisServerFactoryProvider } from './redis-adapter';

@Module({
  imports: [AuthenticationModule, WhiteboardRtModule, AuthorizationModule],
  providers: [ExcalidrawRedisServerFactoryProvider, APP_ID_PROVIDER],
})
export class ExcalidrawServerModule {}
