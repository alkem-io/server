import { Module } from '@nestjs/common';
import { ContributorLookupModule } from '@services/infrastructure/contributor-lookup/contributor.lookup.module';
import { MessageResolverFields } from './message.resolver.fields';

@Module({
  imports: [ContributorLookupModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
