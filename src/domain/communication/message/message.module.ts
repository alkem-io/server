import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { MessageAttachmentModule } from '../message-attachment/message.attachment.module';
import { MessageResolverFields } from './message.resolver.fields';

@Module({
  imports: [ActorLookupModule, MessageAttachmentModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
