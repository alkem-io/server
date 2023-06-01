import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';
import { MessageReactionModule } from '../message.reaction/message.reaction.module';

@Module({
  imports: [UserModule, MessageReactionModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
