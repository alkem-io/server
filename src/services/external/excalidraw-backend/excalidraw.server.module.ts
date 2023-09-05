import { Module } from '@nestjs/common';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ExcalidrawEventPublisherModule } from '@services/excalidraw-pubsub/publisher';
import { ExcalidrawEventSubscriberModule } from '@services/excalidraw-pubsub/subscriber';
import { ExcalidrawServerFactoryProvider } from './excalidraw.server.factory.provider';

@Module({
  imports: [
    AuthenticationModule,
    WhiteboardRtModule,
    AuthorizationModule,
    ExcalidrawEventPublisherModule,
    ExcalidrawEventSubscriberModule,
  ],
  providers: [ExcalidrawServerFactoryProvider],
})
export class ExcalidrawServerModule {}
