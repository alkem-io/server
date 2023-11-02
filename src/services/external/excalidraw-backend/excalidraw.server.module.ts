import { Module } from '@nestjs/common';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ExcalidrawEventPublisherModule } from '@services/excalidraw-pubsub/publisher';
import { ExcalidrawEventSubscriberModule } from '@services/excalidraw-pubsub/subscriber';
// import { ExcalidrawServerFactoryProvider } from './excalidraw.server.factory.provider';
import { ExcalidrawServerFactoryProvider2 } from './excalidraw.server.factory.provider2';
import { APP_ID_PROVIDER } from '@common/app.id.provider';

@Module({
  imports: [
    AuthenticationModule,
    WhiteboardRtModule,
    AuthorizationModule,
    ExcalidrawEventPublisherModule,
    ExcalidrawEventSubscriberModule,
  ],
  providers: [
    /*ExcalidrawServerFactoryProvider, */ ExcalidrawServerFactoryProvider2,
    APP_ID_PROVIDER,
  ],
})
export class ExcalidrawServerModule {}
