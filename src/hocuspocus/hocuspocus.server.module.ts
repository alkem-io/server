import { Module } from '@nestjs/common';
import { HocuspocusServerFactoryProvider } from './hocuspocus.server.factory';
import { HocuspocusGateway } from './hocuspocus.gateway';

@Module({
  providers: [/*HocuspocusServerFactoryProvider,*/ HocuspocusGateway],
})
export class HocuspocusServerModule {}
