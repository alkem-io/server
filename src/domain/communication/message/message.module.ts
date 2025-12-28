import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { ActorLookupModule } from '@domain/actor/actor-lookup/actor.lookup.module';

@Module({
  imports: [ActorLookupModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
