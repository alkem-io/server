import { Module } from '@nestjs/common';
import { HocuspocusServerFactoryProvider } from './hocuspocus.server.factory';

@Module({
  providers: [HocuspocusServerFactoryProvider],
})
export class HocuspocusServerModule {}
