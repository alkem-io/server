import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';

@Module({
  imports: [ContributorLookupModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
