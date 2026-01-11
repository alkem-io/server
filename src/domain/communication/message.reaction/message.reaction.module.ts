import { Module } from '@nestjs/common';
import { MessageReactionResolverFields } from './message.reaction.resolver.fields';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';

@Module({
  imports: [ActorLookupModule],
  providers: [MessageReactionResolverFields],
  exports: [MessageReactionResolverFields],
})
export class MessageReactionModule {}
