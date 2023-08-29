import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { ExcalidrawServerFactoryProvider } from './excalidraw.server.factory.provider';

@Module({
  imports: [AuthenticationModule],
  providers: [ExcalidrawServerFactoryProvider],
})
export class ExcalidrawServerModule {}
