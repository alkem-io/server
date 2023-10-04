import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { UserLookupModule } from '@services/infrastructure/user-lookup/user.lookup.module';

@Module({
  imports: [UserLookupModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
