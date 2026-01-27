import { Module } from '@nestjs/common';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { MessageReactionResolverFields } from './message.reaction.resolver.fields';

@Module({
  imports: [ContributorLookupModule],
  providers: [MessageReactionResolverFields],
  exports: [MessageReactionResolverFields],
})
export class MessageReactionModule {}
