import { MessageResolver } from '@domain/community/message/message.resolver';
import { Module } from '@nestjs/common';

@Module({
  imports: [],
  providers: [MessageResolver],
  exports: [],
})
export class MessageModule {}
