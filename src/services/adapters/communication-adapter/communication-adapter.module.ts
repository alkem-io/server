import { Module } from '@nestjs/common';
import { CommunicationAdapter } from './communication.adapter';
import { CommunicationAdapterEventService } from './communication.adapter.event.service';
import { CommunicationRpcModule } from './communication.rpc.module';

@Module({
  imports: [CommunicationRpcModule],
  providers: [CommunicationAdapter, CommunicationAdapterEventService],
  exports: [CommunicationAdapter],
})
export class CommunicationAdapterModule {}
