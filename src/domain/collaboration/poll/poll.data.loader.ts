import { PollVote } from '@domain/collaboration/poll-vote/poll.vote.entity';
import { Injectable, Scope } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import DataLoader from 'dataloader';
import { In, Repository } from 'typeorm';
import { Poll } from './poll.entity';

/**
 * Request-scoped DataLoader for batching Poll data requests.
 * Prevents N+1 queries when resolving multiple Poll fields
 * (options, totalVotes, canSeeDetailedResults, myVote) for the same poll.
 */
@Injectable({ scope: Scope.REQUEST })
export class PollDataLoader {
  private pollLoader: DataLoader<string, Poll | null>;
  private userVoteLoaders: Map<string, DataLoader<string, PollVote | null>> =
    new Map();

  constructor(
    @InjectRepository(Poll)
    private readonly pollRepository: Repository<Poll>,
    @InjectRepository(PollVote)
    private readonly pollVoteRepository: Repository<PollVote>
  ) {
    this.pollLoader = this.createPollLoader();
  }

  async loadPoll(pollId: string): Promise<Poll | null> {
    return this.pollLoader.load(pollId);
  }

  /**
   * Load the current user's vote for a poll.
   * Creates a separate loader per userId since votes are user-specific.
   */
  async loadUserVote(pollId: string, userId: string): Promise<PollVote | null> {
    let loader = this.userVoteLoaders.get(userId);
    if (!loader) {
      loader = this.createUserVoteLoader(userId);
      this.userVoteLoaders.set(userId, loader);
    }
    return loader.load(pollId);
  }

  private createPollLoader(): DataLoader<string, Poll | null> {
    return new DataLoader<string, Poll | null>(
      async (pollIds: readonly string[]) => {
        const polls = await this.pollRepository.find({
          where: { id: In([...pollIds]) },
          relations: { options: true, votes: true },
        });
        const pollMap = new Map(polls.map(p => [p.id, p]));
        return pollIds.map(id => pollMap.get(id) ?? null);
      },
      { cache: true, name: 'PollLoader' }
    );
  }

  private createUserVoteLoader(
    userId: string
  ): DataLoader<string, PollVote | null> {
    return new DataLoader<string, PollVote | null>(
      async (pollIds: readonly string[]) => {
        const votes = await this.pollVoteRepository.find({
          where: {
            createdBy: userId,
            poll: { id: In([...pollIds]) },
          },
          relations: { poll: true },
        });
        // poll relation is always loaded via `relations: { poll: true }`
        const voteMap = new Map(votes.map(v => [v.poll!.id, v]));
        return pollIds.map(id => voteMap.get(id) ?? null);
      },
      { cache: true, name: `PollUserVoteLoader:${userId}` }
    );
  }
}
