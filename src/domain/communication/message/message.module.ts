import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { MessageWithReadStateResolverFields } from './message.with.read.state.resolver.fields';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';

@Module({
  imports: [ContributorLookupModule],
  providers: [MessageResolverFields, MessageWithReadStateResolverFields],
  exports: [MessageResolverFields, MessageWithReadStateResolverFields],
})
export class MessageModule {}
