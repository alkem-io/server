import { UserModule } from '@domain/community/user/user.module';
import { Module } from '@nestjs/common';
import { MessageResolverFields } from './message.resolver.fields';

@Module({
  imports: [UserModule],
  providers: [MessageResolverFields],
  exports: [MessageResolverFields],
})
export class MessageModule {}
