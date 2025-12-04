import { Module } from '@nestjs/common';
import { CommunicationAdapter } from './communication.adapter';
import { CommunicationRpcModule } from './communication.rpc.module';

@Module({
  imports: [CommunicationRpcModule],
  providers: [CommunicationAdapter],
  exports: [CommunicationAdapter],
})
export class CommunicationAdapterModule {}
