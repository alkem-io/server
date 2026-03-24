import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PollVote } from './poll.vote.entity';
import { PollVoteService } from './poll.vote.service';

@Module({
  imports: [TypeOrmModule.forFeature([PollVote])],
  providers: [PollVoteService],
  exports: [PollVoteService],
})
export class PollVoteModule {}
