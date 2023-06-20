import { Module } from '@nestjs/common';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { HocuspocusServerFactoryProvider } from './hocuspocus.server.factory';

@Module({
  imports: [AuthenticationModule],
  providers: [HocuspocusServerFactoryProvider],
})
export class HocuspocusServerModule {}
