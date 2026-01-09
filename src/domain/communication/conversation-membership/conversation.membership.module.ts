import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationMembership } from './conversation.membership.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationMembership])],
  exports: [TypeOrmModule],
})
export class ConversationMembershipModule {}
