import { Module } from '@nestjs/common';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { ExcalidrawEventPublisherService } from './excalidraw.event.publisher.service';

@Module({
  providers: [ExcalidrawEventPublisherService, APP_ID_PROVIDER],
  exports: [ExcalidrawEventPublisherService],
})
export class ExcalidrawEventPublisherModule {}
