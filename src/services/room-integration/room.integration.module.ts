import { Module, forwardRef } from '@nestjs/common';
import { RoomControllerService } from './room.controller.service';
import { RoomModule } from '@domain/communication/room/room.module';
import { SubscriptionServiceModule } from '@services/subscriptions/subscription-service';

@Module({
  // No way araund the forward ref unfortunately
  // Scope [AppModule -> AuthenticationModule -> UserModule -> RoomModule -> VirtualContributorModule -> AiPersonaModule -> AiServerAdapterModule -> AiServerModule]
  // so the room needs the VC in order to invoke the engine which needs the AI server which needs this module to handle the result, and this module needs the Room in order to post
  // a reply/message; once the hard link between the collaboration and AI server is broken this will automatically go away
  imports: [forwardRef(() => RoomModule), SubscriptionServiceModule],
  providers: [RoomControllerService],
  exports: [RoomControllerService],
})
export class RoomIntegrationModule {}
