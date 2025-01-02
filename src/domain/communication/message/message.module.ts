import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { UserLookupModule } from '@domain/community/user-lookup/user.lookup.module';
import { VirtualContributorLookupModule } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.module';

@Module({
  imports: [UserLookupModule, VirtualContributorLookupModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
