import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CommunicationAdapter } from './communication.adapter';
import { CommunicationAdapterEventService } from './communication.adapter.event.service';
import { CommunicationRpcModule } from './communication.rpc.module';
import { MatrixMediaUploadClient } from './matrix.media.upload.client';

@Module({
  imports: [CommunicationRpcModule, HttpModule],
  providers: [
    CommunicationAdapter,
    CommunicationAdapterEventService,
    MatrixMediaUploadClient,
  ],
  exports: [CommunicationAdapter, MatrixMediaUploadClient],
})
export class CommunicationAdapterModule {}
