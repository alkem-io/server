import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';
import { Module } from '@nestjs/common';
import { MessageReactionResolverFields } from './message.reaction.resolver.fields';

@Module({
  imports: [ActorLookupModule],
  providers: [MessageReactionResolverFields],
  exports: [MessageReactionResolverFields],
})
export class MessageReactionModule {}
