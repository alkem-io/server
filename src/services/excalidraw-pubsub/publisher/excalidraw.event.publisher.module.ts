import { Module } from '@nestjs/common';
import { ExcalidrawEventPublisherService } from './excalidraw.event.publisher.service';

@Module({
  providers: [ExcalidrawEventPublisherService],
  exports: [ExcalidrawEventPublisherService],
})
export class ExcalidrawEventPublisherModule {}
