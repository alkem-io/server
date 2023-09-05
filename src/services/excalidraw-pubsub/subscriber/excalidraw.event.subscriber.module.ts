import { Module } from '@nestjs/common';
import { ExcalidrawEventSubscriberService } from './excalidraw.event.subscriber.service';

@Module({
  imports: [ExcalidrawEventSubscriberService],
  exports: [ExcalidrawEventSubscriberService],
})
export class ExcalidrawEventSubscriberModule {}
