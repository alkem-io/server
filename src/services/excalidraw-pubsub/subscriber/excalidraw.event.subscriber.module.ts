import { Module } from '@nestjs/common';
import { ExcalidrawEventSubscriberService } from './excalidraw.event.subscriber.service';
import { APP_ID_PROVIDER } from '@common/app.id.provider';

@Module({
  providers: [ExcalidrawEventSubscriberService, APP_ID_PROVIDER],
  exports: [ExcalidrawEventSubscriberService],
})
export class ExcalidrawEventSubscriberModule {}
