import { Module } from '@nestjs/common';
import { MessageReactionResolverFields } from './message.reaction.resolver.fields';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';

@Module({
  imports: [ContributorLookupModule],
  providers: [MessageReactionResolverFields],
  exports: [MessageReactionResolverFields],
})
export class MessageReactionModule {}
