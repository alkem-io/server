import { Module } from '@nestjs/common';
import { WhiteboardRtModule } from '@domain/common/whiteboard-rt';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { ExcalidrawEventPublisherModule } from '@services/excalidraw-pubsub/publisher';
import { ExcalidrawEventSubscriberModule } from '@services/excalidraw-pubsub/subscriber';
import { APP_ID_PROVIDER } from '@common/app.id.provider';
import { ExcalidrawRedisServerFactoryProvider } from './redis-adapter';

@Module({
  imports: [
    AuthenticationModule,
    WhiteboardRtModule,
    AuthorizationModule,
    ExcalidrawEventPublisherModule,
    ExcalidrawEventSubscriberModule,
  ],
  providers: [ExcalidrawRedisServerFactoryProvider, APP_ID_PROVIDER],
})
export class ExcalidrawServerModule {}
