import { Module } from '@nestjs/common';
import { MessageDetailsService } from './message.details.service';
import { MessageDetailsResolverFields } from './message.details.resolver.fields';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';

@Module({
  imports: [RoomLookupModule, UrlGeneratorModule, EntityResolverModule],
  providers: [MessageDetailsResolverFields, MessageDetailsService],
  exports: [MessageDetailsService],
})
export class MessageDetailsModule {}
