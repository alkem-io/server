import { Module } from '@nestjs/common';
import { CommunicationAdapterModule } from '@services/platform/communication-adapter/communication-adapter.module';
import { IdentityResolverModule } from '../identity-resolver/identity.resolver.module';
import { RoomService } from './room.service';

@Module({
  imports: [IdentityResolverModule, CommunicationAdapterModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
