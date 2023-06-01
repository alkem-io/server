import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { MessageReactionResolverFields } from './message.resolver.fields';

@Module({
  imports: [UserModule],
  providers: [MessageReactionResolverFields],
  exports: [MessageReactionResolverFields],
})
export class MessageReactionModule {}
