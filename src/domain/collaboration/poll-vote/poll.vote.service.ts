import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { EntityNotFoundException } from '@common/exceptions/entity.not.found.exception';
import { Poll } from '@domain/collaboration/poll/poll.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PollVote } from './poll.vote.entity';

@Injectable()
export class PollVoteService {
  constructor(
    @InjectRepository(PollVote)
    private pollVoteRepository: Repository<PollVote>
  ) {}

  async castVoteOnPoll(
    poll: Poll,
    voterId: string,
    selectedOptionIds: string[]
  ): Promise<Poll> {
    const options = poll.options ?? [];

    // Validate all selected option IDs exist in this poll
    const validOptionIds = new Set(options.map(o => o.id));
    for (const optionId of selectedOptionIds) {
      if (!validOptionIds.has(optionId)) {
        throw new ValidationException(
          'One or more selected option IDs do not belong to this poll',
          LogContext.COLLABORATION,
          { optionId, pollId: poll.id }
        );
      }
    }

    // Validate no duplicates within submission
    const uniqueIds = new Set(selectedOptionIds);
    if (uniqueIds.size !== selectedOptionIds.length) {
      throw new ValidationException(
        'Duplicate option IDs are not allowed in a vote',
        LogContext.COLLABORATION
      );
    }

    // Validate minResponses
    if (selectedOptionIds.length < poll.settings.minResponses) {
      throw new ValidationException(
        'Selection count is below the minimum required',
        LogContext.COLLABORATION,
        {
          minResponses: poll.settings.minResponses,
          provided: selectedOptionIds.length,
        }
      );
    }

    // Validate maxResponses (0 = unlimited)
    if (
      poll.settings.maxResponses > 0 &&
      selectedOptionIds.length > poll.settings.maxResponses
    ) {
      throw new ValidationException(
        'Cannot select more than maxResponses option(s)',
        LogContext.COLLABORATION,
        { maxResponses: poll.settings.maxResponses }
      );
    }

    // Upsert: find existing vote or create new one
    let vote = await this.pollVoteRepository.findOne({
      where: { createdBy: voterId, poll: { id: poll.id } },
      relations: { poll: true },
    });

    if (vote) {
      // Full replacement of existing vote
      vote.selectedOptionIds = selectedOptionIds;
    } else {
      vote = new PollVote();
      vote.createdBy = voterId;
      vote.selectedOptionIds = selectedOptionIds;
      vote.poll = poll;
    }

    await this.pollVoteRepository.save(vote);

    // Re-fetch poll with fresh relations so callers (including subscription
    // publishers) receive up-to-date vote data.
    const freshPoll = await this.pollVoteRepository.manager
      .getRepository(Poll)
      .findOneOrFail({
        where: { id: poll.id },
        relations: { options: true, votes: true },
      });

    return freshPoll;
  }

  async getVoteForUser(
    pollId: string,
    userId: string
  ): Promise<PollVote | null> {
    return this.pollVoteRepository.findOne({
      where: { createdBy: userId, poll: { id: pollId } },
      relations: { poll: true },
    });
  }

  async getVotesForPoll(pollId: string): Promise<PollVote[]> {
    return this.pollVoteRepository.find({
      where: { poll: { id: pollId } },
      relations: { poll: true },
    });
  }

  async deleteVotesByIds(voteIds: string[]): Promise<void> {
    if (voteIds.length === 0) return;
    await this.pollVoteRepository.delete(voteIds);
  }
}
