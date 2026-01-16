import { Module } from '@nestjs/common';
import { CommunicationAdapter } from './communication.adapter';
import { CommunicationRpcModule } from './communication.rpc.module';
import { CommunicationAdapterEventService } from './communication.adapter.event.service';

@Module({
  imports: [CommunicationRpcModule],
  providers: [CommunicationAdapter, CommunicationAdapterEventService],
  exports: [CommunicationAdapter],
})
export class CommunicationAdapterModule {}
