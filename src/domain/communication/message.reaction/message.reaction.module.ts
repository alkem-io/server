import { Module } from '@nestjs/common';
import { MessageReactionResolverFields } from './message.reaction.resolver.fields';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';

@Module({
  imports: [UserLookupModule],
  providers: [MessageReactionResolverFields],
  exports: [MessageReactionResolverFields],
})
export class MessageReactionModule {}
