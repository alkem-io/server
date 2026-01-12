import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationMembership } from './conversation.membership.entity';
import { ConversationMembershipService } from './conversation.membership.service';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationMembership])],
  providers: [ConversationMembershipService],
  exports: [TypeOrmModule, ConversationMembershipService],
})
export class ConversationMembershipModule {}
