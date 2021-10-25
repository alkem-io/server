import { Module } from '@nestjs/common';
import { IdentityResolverModule } from '../identity-resolver/identity.resolver.module';
import { RoomService } from './room.service';

@Module({
  imports: [IdentityResolverModule],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
