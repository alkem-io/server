import { Module } from '@nestjs/common';
import { EntityResolverModule } from '@services/infrastructure/entity-resolver/entity.resolver.module';
import { UrlGeneratorModule } from '@services/infrastructure/url-generator';
import { RoomLookupModule } from '../room-lookup/room.lookup.module';
import { MessageDetailsResolverFields } from './message.details.resolver.fields';
import { MessageDetailsService } from './message.details.service';

@Module({
  imports: [RoomLookupModule, UrlGeneratorModule, EntityResolverModule],
  providers: [MessageDetailsResolverFields, MessageDetailsService],
  exports: [MessageDetailsService],
})
export class MessageDetailsModule {}
