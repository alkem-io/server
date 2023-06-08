import { Module } from '@nestjs/common';
import { HocuspocusServerFactoryProvider } from './hocuspocus.server.factory';
import { HocuspocusGateway } from './hocuspocus.gateway';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { CalloutModule } from '@domain/collaboration/callout/callout.module';

@Module({
  imports: [AuthenticationModule, CalloutModule],
  providers: [HocuspocusServerFactoryProvider, HocuspocusGateway],
})
export class HocuspocusServerModule {}
